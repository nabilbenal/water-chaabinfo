

# Audit complet du projet — gestion_releve_eaux2026

## Résumé

Après inspection complète du code source, voici l'audit organisé par priorité : sécurité, architecture, dette technique, performance, et dépendances.

---

## PRIORITÉ 1 — Failles de sécurité (Critique)

### 1.1 Authentification sans protection réelle
- Le login en mode `mock` accepte **n'importe quel matricule/mot de passe** (fichier `AppContext.tsx` lignes 115-121). Le fallback `catch` authentifie si les champs sont non-vides.
- Le token JWT est stocké dans une **variable JavaScript en mémoire** (`api.ts` ligne 54), perdu au refresh. Aucune persistance sécurisée.
- Aucune validation côté client des inputs login (pas de Zod, pas de limite de longueur).

### 1.2 Pas de protection des routes
- L'état `isAuthenticated` est un simple `useState(false)` en mémoire. Au refresh, l'utilisateur est déconnecté mais les données IndexedDB restent accessibles.
- Pas de mécanisme de refresh token ni d'expiration de session.

### 1.3 Photos stockées en DataURL brut
- Les photos (`CameraResultType.DataUrl`) sont stockées comme base64 dans IndexedDB et envoyées telles quelles au serveur. Risque de payload énorme et pas de validation du contenu.

### 1.4 Import JSON sans validation
- `parseLoadedDataFromJSON` parse n'importe quel JSON sans schéma Zod. Un fichier malformé peut injecter des données arbitraires dans le state.

**Actions :**
- Ajouter validation Zod sur le login et l'import JSON
- Persister le token de manière sécurisée (httpOnly cookie côté serveur, ou au minimum IndexedDB avec expiration)
- Valider/compresser les photos avant stockage
- Restaurer la session auth depuis IndexedDB au mount

---

## PRIORITÉ 2 — Architecture (Important)

### 2.1 AppContext monolithique (263 lignes)
- `AppContext.tsx` gère auth, data, releves, config, sync — tout dans un seul contexte. Chaque changement de state re-render **toute l'app**.

### 2.2 Pas de séparation des responsabilités
- La logique métier (conversion relevés → format CSO, calcul stats) est dans le contexte au lieu de services/hooks dédiés.

### 2.3 TanStack React Query installé mais inutilisé
- `QueryClientProvider` est monté dans `App.tsx` mais aucune query n'utilise `useQuery`/`useMutation`. Tout passe par des `useState` manuels.

### 2.4 `next-themes` installé mais inutilisé
- Package présent dans les dépendances sans utilisation visible.

**Actions :**
- Découper AppContext en contextes séparés (AuthContext, DataContext, ReleveContext)
- Extraire la logique métier dans des hooks (`useReleves`, `useSync`, `useStats`)
- Migrer les appels API vers React Query pour le cache, retry, et loading states
- Supprimer `next-themes` ou l'implémenter

---

## PRIORITÉ 3 — Dette technique (Modéré)

### 3.1 Type `Abonne` incohérent
- Le type définit `NUM_PNT_DRT_ABO: string` mais ce champ n'existe **pas** dans l'interface `Abonne` de `types/water.ts`. Il est utilisé partout (`TourneePage`, `AppContext`). Le champ réel est `NUM_PNT_DRT_ABO` qui est ajouté implicitement via le mock data sans être dans le type.

### 3.2 Pas de tests significatifs
- Un seul fichier test (`example.test.ts`) avec un test trivial. Aucun test pour la logique métier, le parsing JSON, ou les composants.

### 3.3 Duplication de composants Toaster
- Deux systèmes de toast montés simultanément : `@radix-ui/react-toast` (Toaster) ET `sonner` (Sonner).

### 3.4 Console.log en production
- `parseLoadedDataFromJSON` contient des `console.log` de debug qui fuiront en production.

### 3.5 `@types/leaflet` en dependencies au lieu de devDependencies

**Actions :**
- Corriger le type `Abonne` pour inclure `NUM_PNT_DRT_ABO`
- Écrire des tests unitaires pour `parseLoadedDataFromJSON`, `persistence.ts`, et les calculs de stats
- Choisir un seul système de toast
- Déplacer `@types/leaflet` en devDependencies
- Remplacer les console.log par un logger conditionnel

---

## PRIORITÉ 4 — Performance (Modéré)

### 4.1 Pas de virtualisation pour les longues listes
- `TourneePage` rend tous les abonnés d'un coup. Avec des tournées de 500+ compteurs, le DOM sera saturé.

### 4.2 Animations Framer Motion sur chaque item de liste
- Chaque carte abonné a une animation `motion.div` avec delay incrémental — coûteux sur mobile avec beaucoup d'items.

### 4.3 Map Leaflet rechargée à chaque navigation
- Pas de mise en cache des tiles ni de lazy loading du composant map.

### 4.4 IndexedDB writes à chaque changement de state
- Les `useEffect` de persistance écrivent dans IndexedDB à chaque modification de `releves`, même pour des changements mineurs.

**Actions :**
- Ajouter `react-virtuoso` ou `@tanstack/react-virtual` pour les listes longues
- Limiter les animations à un seuil (ex: max 20 items animés)
- Lazy-load le composant carte avec `React.lazy`
- Debouncer les écritures IndexedDB

---

## PRIORITÉ 5 — Dépendances (Faible)

### 5.1 Packages potentiellement surdimensionnés
- **30+ packages Radix UI** installés. Beaucoup sont des composants shadcn/ui jamais utilisés (menubar, navigation-menu, hover-card, input-otp, carousel, etc.)

### 5.2 Capacitor packages en dependencies web
- `@capacitor/android`, `@capacitor/ios`, `@capacitor/cli` sont en `dependencies` au lieu de `devDependencies`.

### 5.3 jsdom version ancienne
- `jsdom: ^20.0.3` — la version actuelle est 24.x+.

**Actions :**
- Auditer et supprimer les composants Radix/shadcn inutilisés
- Déplacer les packages Capacitor build-only en devDependencies
- Mettre à jour jsdom vers ^24.x

---

## Plan d'action résumé par ordre d'exécution

| # | Action | Priorité | Effort |
|---|--------|----------|--------|
| 1 | Validation Zod sur login + import JSON | Critique | Moyen |
| 2 | Corriger le type Abonne (NUM_PNT_DRT_ABO) | Critique | Faible |
| 3 | Persister/restaurer la session auth | Critique | Moyen |
| 4 | Découper AppContext en 3 contextes | Important | Élevé |
| 5 | Migrer les appels API vers React Query | Important | Moyen |
| 6 | Ajouter virtualisation des listes | Modéré | Moyen |
| 7 | Écrire tests unitaires critiques | Modéré | Moyen |
| 8 | Cleanup dépendances inutilisées | Faible | Faible |
| 9 | Debouncer les écritures IndexedDB | Modéré | Faible |
| 10 | Lazy-load composants lourds (Map) | Modéré | Faible |

