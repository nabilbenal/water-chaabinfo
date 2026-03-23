# 📱 Relève d'Eau Mobile

Application mobile de relevé de compteurs d'eau destinée aux agents releveurs. Elle permet le chargement des tournées depuis un ERP, la saisie des index de consommation sur le terrain (manuelle, scanner ou radio), la géolocalisation, la prise de photos, et le déchargement des données vers le serveur.

---

## 📑 Table des matières

1. [Fonctionnalités](#-fonctionnalités)
2. [Architecture technique](#-architecture-technique)
3. [Stack technologique](#-stack-technologique)
4. [Structure du projet](#-structure-du-projet)
5. [Installation](#-installation)
6. [Utilisation](#-utilisation)
7. [Modes de fonctionnement](#-modes-de-fonctionnement)
8. [Modèle de données](#-modèle-de-données)
9. [Persistance locale](#-persistance-locale)
10. [Cartographie](#-cartographie)
11. [Livrables](#-livrables)
12. [Déploiement](#-déploiement)
13. [Recommandations](#-recommandations)
14. [Licence](#-licence)

---

## 🚀 Fonctionnalités

### Authentification
- Connexion agent par matricule et mot de passe
- Mode mock (données de test) et mode API (connexion ERP réelle)

### Tableau de bord
- Statistiques en temps réel : total abonnés, relevés effectués, en attente, anomalies
- Barre de progression de la tournée
- Carte interactive des compteurs (marqueurs vert/rouge selon statut)

### Gestion des tournées
- Liste des abonnés de la tournée avec statut visuel
- Recherche par nom, adresse ou numéro de compte
- Carte de localisation des compteurs sur la wilaya de Constantine
- Navigation directe depuis la carte vers la fiche de relevé

### Saisie des relevés
- **3 méthodes de saisie** : manuelle, scanner (code-barres), radio
- Validation automatique de l'index (contrôle cohérence, consommation min/max)
- Signalement d'anomalies avec codes prédéfinis
- Motifs d'annulation de relevé
- Prise de photo du compteur (via Capacitor Camera)
- Capture GPS automatique (via Capacitor Geolocation)
- Champ commentaire libre

### Historique
- Liste des relevés effectués avec date, index et consommation
- Carte de synthèse des relevés réalisés

### Profil agent
- Informations agent et tournée
- Import de données JSON depuis fichier local
- Basculement mode mock / API
- Résumé des données chargées
- Déconnexion

### Chargement / Déchargement
- **Chargement** : téléchargement des données de tournée depuis l'ERP
- **Déchargement** : envoi des relevés et photos vers le serveur
- Support import JSON local (fichier)

---

## 🏗 Architecture technique

```
┌─────────────────────────────────────────────┐
│              Application React              │
│  (SPA mobile-first, max-w-lg, bottom nav)   │
├─────────────────────────────────────────────┤
│  AppContext (état global)                   │
│  ├─ Auth (agent, token)                    │
│  ├─ LoadedData (abonnés, tournées, etc.)   │
│  ├─ Relevés locaux (ReleveLocal[])         │
│  └─ Stats / mode API                      │
├─────────────────────────────────────────────┤
│  Persistance IndexedDB (idb-keyval)        │
│  ├─ loadedData                             │
│  ├─ releves                                │
│  ├─ lastLoadDate / lastUnloadDate          │
│  └─ authAgent                              │
├─────────────────────────────────────────────┤
│  Services                                  │
│  ├─ api.ts (communication ERP)             │
│  ├─ persistence.ts (IndexedDB)             │
│  └─ native.ts (Camera, GPS via Capacitor)  │
├─────────────────────────────────────────────┤
│  Capacitor (Android / iOS)                 │
│  ├─ @capacitor/camera                      │
│  ├─ @capacitor/geolocation                 │
│  └─ WebView (dist/)                        │
└─────────────────────────────────────────────┘
```

---

## 🧰 Stack technologique

| Couche        | Technologie                          |
|---------------|--------------------------------------|
| Framework UI  | React 18 + TypeScript                |
| Build         | Vite 5                               |
| Styles        | Tailwind CSS 3 + shadcn/ui          |
| Routage       | React Router DOM 6                   |
| État global   | React Context API                    |
| Requêtes      | TanStack React Query 5               |
| Cartographie  | Leaflet + react-leaflet 4.2          |
| Persistance   | IndexedDB via idb-keyval             |
| Animations    | Framer Motion                        |
| Graphiques    | Recharts                             |
| Mobile natif  | Capacitor 8 (Android + iOS)          |
| Tests         | Vitest + Testing Library             |
| Formulaires   | React Hook Form + Zod               |

---

## 📁 Structure du projet

```
src/
├── App.tsx                    # Routes et layout principal
├── main.tsx                   # Point d'entrée
├── index.css                  # Tokens de design (CSS variables)
│
├── pages/
│   ├── LoginPage.tsx          # Authentification agent
│   ├── DashboardPage.tsx      # Tableau de bord + carte
│   ├── TourneePage.tsx        # Liste abonnés + carte
│   ├── RelevePage.tsx         # Saisie d'un relevé
│   ├── HistoriquePage.tsx     # Historique des relevés
│   ├── ProfilPage.tsx         # Profil + paramètres
│   └── NotFound.tsx           # Page 404
│
├── components/
│   ├── BottomNav.tsx          # Navigation mobile
│   ├── MeterStatusMap.tsx     # Carte des compteurs (vert/rouge)
│   ├── GPSMap.tsx             # Mini-carte GPS d'un relevé
│   ├── MapErrorBoundary.tsx   # Fallback erreur carte
│   ├── NavLink.tsx            # Lien de navigation
│   └── ui/                    # Composants shadcn/ui
│
├── contexts/
│   └── AppContext.tsx         # État global de l'application
│
├── services/
│   ├── api.ts                 # Communication ERP (login, load, unload)
│   ├── persistence.ts         # Persistance IndexedDB
│   └── native.ts              # Services natifs (caméra, GPS)
│
├── types/
│   └── water.ts               # Interfaces TypeScript (schéma SQL)
│
├── data/
│   └── mockData.ts            # Données de test
│
├── hooks/
│   ├── use-mobile.tsx         # Détection mobile
│   └── use-toast.ts           # Notifications toast
│
├── lib/
│   └── utils.ts               # Utilitaires (cn, etc.)
│
└── test/
    ├── setup.ts               # Configuration Vitest
    └── example.test.ts        # Test exemple

capacitor.config.json          # Configuration Capacitor (Android/iOS)
```

---

## ⚙️ Installation

### Prérequis

- **Node.js** ≥ 18 (recommandé : via [nvm](https://github.com/nvm-sh/nvm))
- **npm** ou **bun** (gestionnaire de paquets)
- **Android Studio** (pour build Android)
- **Xcode** (pour build iOS, macOS uniquement)

### 1. Cloner le dépôt

```bash
git clone <URL_DU_DEPOT>
cd <NOM_DU_PROJET>
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Lancer en mode développement (web)

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

### 4. Build de production

```bash
npm run build
```

Les fichiers statiques sont générés dans le dossier `dist/`.

### 5. Build mobile (Capacitor)

```bash
# Build web
npm run build

# Synchroniser avec les projets natifs
npx cap sync

# Ouvrir dans Android Studio
npx cap open android

# Ou ouvrir dans Xcode (macOS)
npx cap open ios
```

### 6. Lancer les tests

```bash
npm run test          # Exécution unique
npm run test:watch    # Mode watch
```

---

## 📖 Utilisation

### Flux de travail type d'un agent

1. **Connexion** : l'agent se connecte avec son matricule et mot de passe
2. **Chargement** : téléchargement des données de tournée depuis l'ERP (ou import JSON)
3. **Consultation du tableau de bord** : vue d'ensemble de la tournée (stats + carte)
4. **Tournée** : parcours de la liste des abonnés, navigation via carte ou liste
5. **Relevé** : pour chaque abonné :
   - Saisie de l'index (manuel, scanner ou radio)
   - Photo du compteur (optionnel)
   - Capture GPS (optionnel)
   - Signalement anomalie si nécessaire
   - Validation
6. **Vérification** : consultation de l'historique des relevés effectués
7. **Déchargement** : envoi des relevés vers le serveur ERP

---

## 🔄 Modes de fonctionnement

### Mode Mock (par défaut)
- Utilise des données fictives intégrées (`mockData.ts`)
- Aucune connexion réseau requise
- Idéal pour les tests et démonstrations

### Mode API
- Connexion réelle à l'ERP via endpoints REST
- Configuration dans `src/services/api.ts` :
  - `BASE_URL` : URL du serveur ERP
  - `ENDPOINTS` : `/login`, `/load`, `/unload`
  - `TIMEOUT` : délai d'attente (ms)
- Authentification par token JWT

### Basculement
Le mode se change depuis la page **Profil** via le switch "Connexion API".

---

## 📊 Modèle de données

Les types sont définis dans `src/types/water.ts` et correspondent au schéma SQL de facturation d'eau :

| Entité                  | Interface TypeScript         | Description                              |
|-------------------------|------------------------------|------------------------------------------|
| Abonné                  | `Abonne`                     | Client avec adresse et compteur          |
| Tournée                 | `Tournee`                    | Regroupement de relevés par période      |
| Compteur                | `Compteur`                   | Appareil de mesure physique              |
| Anomalie de relevé      | `AnomalieReleve`             | Code anomalie constatée                  |
| Annulation de relevé    | `AnnulationReleve`           | Motif d'annulation                       |
| Accessibilité compteur  | `AccessibiliteCompteur`      | État d'accès au compteur                 |
| Modèle compteur         | `ModeleCompteur`             | Type/marque du compteur                  |
| Porte point droit       | `PortePointDroit`            | Localisation physique                    |
| Consommation            | `Consommation`               | Historique de consommation               |
| Relevé local            | `ReleveLocal`                | Relevé saisi sur le terrain              |
| Photo relevé            | `PhotoReleve`                | Photo associée à un relevé              |
| Paramètre               | `Parametre`                  | Configuration système                    |

---

## 💾 Persistance locale

L'application utilise **IndexedDB** (via `idb-keyval`) pour stocker les données hors-ligne :

| Clé               | Contenu                        | Usage                              |
|-------------------|--------------------------------|------------------------------------|
| `loadedData`      | Données de tournée complètes   | Abonnés, anomalies, compteurs...   |
| `releves`         | Relevés effectués localement   | Saisies de l'agent                 |
| `lastLoadDate`    | Date du dernier chargement     | Affichage profil                   |
| `lastUnloadDate`  | Date du dernier déchargement   | Affichage profil                   |
| `authAgent`       | Données de l'agent connecté    | Session                            |

Les données persistent entre les sessions et survivent à la fermeture de l'application. Elles sont effacées à la déconnexion.

---

## 🗺 Cartographie

### Carte des compteurs (`MeterStatusMap`)
- Affichée sur les pages **Dashboard**, **Tournée** et **Historique**
- Centrée sur la **wilaya de Constantine** (36.365, 6.615)
- Marqueurs colorés :
  - 🟢 **Vert** : relevé effectué
  - 🔴 **Rouge** : en attente de relevé
- Popup au clic avec infos abonné + bouton "Ouvrir le relevé →"
- Utilise les coordonnées GPS réelles si disponibles, sinon position déterministe

### Mini-carte GPS (`GPSMap`)
- Affichée sur la page de relevé après capture GPS
- Marqueur unique sur la position du compteur

### Gestion des erreurs (`MapErrorBoundary`)
- Error boundary React autour de chaque carte
- Affiche un fallback "Carte indisponible" avec bouton "Réessayer"

---

## 📦 Livrables

### Application Web (PWA-ready)
- Build Vite optimisé (`dist/`)
- Compatible tous navigateurs modernes
- Interface mobile-first (max-width: 448px centré)

### Application Mobile Native
- **Android** : projet Capacitor dans `android/`
- **iOS** : projet Capacitor dans `ios/`
- Permissions : Caméra, Géolocalisation

### Code source
- Code TypeScript typé intégralement
- Composants UI réutilisables (shadcn/ui)
- Architecture contexte + services + pages

### Documentation
- Ce fichier README.md
- Types documentés dans `src/types/water.ts`
- Données mock pour tests dans `src/data/mockData.ts`

---

## 🚀 Déploiement

### Web (Lovable)
1. Ouvrir le projet sur [Lovable](https://lovable.dev)
2. Cliquer sur **Share → Publish**
3. L'application est accessible via l'URL de staging `*.lovable.app`
4. Possibilité de connecter un domaine personnalisé

### Web (auto-hébergement)
```bash
npm run build
# Servir le dossier dist/ avec nginx, Apache, ou tout serveur statique
```

Exemple configuration **nginx** :
```nginx
server {
    listen 80;
    server_name releve-eau.example.com;
    root /var/www/releve-eau/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Mobile (Android)
```bash
npm run build
npx cap sync android
npx cap open android
# Build APK/AAB depuis Android Studio
```

### Mobile (iOS)
```bash
npm run build
npx cap sync ios
npx cap open ios
# Build depuis Xcode (nécessite un compte Apple Developer)
```

---

## 💡 Recommandations

### Sécurité
- ⚠️ Ne jamais stocker de clés API privées dans le code source
- Utiliser HTTPS pour toutes les communications avec l'ERP
- Implémenter un mécanisme d'expiration de token JWT
- Chiffrer les données sensibles dans IndexedDB en production
- Ajouter une gestion de rôles côté serveur

### Performance
- Les données de tournée peuvent être volumineuses : envisager la pagination
- Compresser les photos avant envoi (réduire la taille des fichiers)
- Utiliser le lazy loading pour les composants lourds (cartes)
- Mettre en cache les tuiles de carte pour usage hors-ligne

### Évolutions recommandées
- 🔲 **Mode hors-ligne complet** : Service Worker pour fonctionner sans connexion
- 🔲 **Synchronisation automatique** : déchargement automatique en arrière-plan
- 🔲 **Lecture radio réelle** : intégration module radio Bluetooth/NFC
- 🔲 **Scanner code-barres** : intégration caméra + décodage via ML Kit ou ZXing
- 🔲 **Notifications push** : alertes nouvelles tournées ou rappels
- 🔲 **Export CSV/PDF** : génération de rapports de tournée
- 🔲 **Multi-langue** : support arabe et anglais en plus du français
- 🔲 **Signature agent** : validation du relevé par signature tactile
- 🔲 **Historique de consommation** : graphiques d'évolution par abonné

### Qualité
- Augmenter la couverture de tests (unitaires + intégration)
- Ajouter des tests E2E avec Playwright ou Cypress
- Mettre en place un pipeline CI/CD (GitHub Actions)
- Utiliser ESLint + Prettier pour la cohérence du code
- Documenter l'API ERP avec OpenAPI/Swagger

### UX mobile
- Tester sur appareils réels (Android 10+, iOS 15+)
- Optimiser pour les écrans de 5" à 7"
- Gérer les cas de connectivité intermittente
- Ajouter un indicateur de synchronisation dans la barre de navigation

---

## 📄 Licence

Projet propriétaire — Tous droits réservés.

---

> **Version** : 0.0.0  
> **Nom de l'application** : Relève d'Eau Mobile  
> **ID Capacitor** : `app.lovable.3a09cb4d47944122821eea1465d0326d`
