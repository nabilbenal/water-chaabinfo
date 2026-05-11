import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronRight, Smartphone, MapPin, Camera, Wifi, WifiOff, Database, Shield, Upload, Download, BarChart3, HelpCircle, Info, Zap, FileText, Bug, Globe, Lock, Github, GitPullRequest } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  delay?: number;
}

function CollapsibleSection({ icon, title, children, defaultOpen = false, delay = 0 }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      className="bg-card rounded-xl shadow-card border border-border overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left active:bg-muted/50 transition-colors"
      >
        {icon}
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed space-y-2 border-t border-border pt-3">{children}</div>}
    </motion.div>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 items-start"><span className="text-primary mt-0.5">•</span><span>{children}</span></p>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-foreground text-xs mt-2 mb-1">{children}</p>;
}

export default function AidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero pt-safe px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-primary-foreground/20 backdrop-blur-sm active:scale-95 transition-transform">
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <h1 className="text-lg font-bold text-primary-foreground">Aide & À propos</h1>
        </div>
        <p className="text-sm text-primary-foreground/80 leading-relaxed">
          Application mobile de relevé de compteurs d'eau pour les agents releveurs.
        </p>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {/* Présentation */}
        <CollapsibleSection icon={<Info className="w-5 h-5 text-primary" />} title="Présentation" defaultOpen delay={0}>
          <p>
            <strong className="text-foreground">Relève d'Eau Mobile</strong> permet le chargement des tournées depuis un ERP,
            la saisie des index de consommation sur le terrain, la géolocalisation, la prise de photos
            et le déchargement des données vers le serveur.
          </p>
          <SubTitle>Fonctionnalités principales</SubTitle>
          <BulletItem>Chargement et déchargement des tournées (ERP ou fichier JSON)</BulletItem>
          <BulletItem>3 méthodes de saisie : manuelle, scanner, radio</BulletItem>
          <BulletItem>Validation automatique des index (cohérence, consommation min/max)</BulletItem>
          <BulletItem>Signalement d'anomalies et motifs d'annulation</BulletItem>
          <BulletItem>Photo du compteur et capture GPS</BulletItem>
          <BulletItem>Carte interactive des compteurs (vert = fait, rouge = en attente)</BulletItem>
          <BulletItem>Historique des relevés effectués</BulletItem>
        </CollapsibleSection>

        {/* Guide d'utilisation */}
        <CollapsibleSection icon={<FileText className="w-5 h-5 text-accent" />} title="Guide d'utilisation" delay={0.05}>
          <SubTitle>1. Connexion</SubTitle>
          <p>Connectez-vous avec votre matricule et mot de passe agent.</p>

          <SubTitle>2. Chargement des données</SubTitle>
          <p>Depuis le <strong className="text-foreground">Tableau de bord</strong>, appuyez sur <strong className="text-foreground">Charger</strong> pour télécharger les données de tournée.
            Vous pouvez aussi importer un fichier JSON depuis la page <strong className="text-foreground">Profil</strong>.</p>

          <SubTitle>3. Consultation de la tournée</SubTitle>
          <p>La page <strong className="text-foreground">Tournée</strong> affiche la liste des abonnés avec leur statut.
            Utilisez la recherche ou la carte pour trouver un abonné.</p>

          <SubTitle>4. Saisie d'un relevé</SubTitle>
          <BulletItem>Sélectionnez un abonné dans la liste ou sur la carte</BulletItem>
          <BulletItem>Choisissez la méthode de saisie (manuel, scanner, radio)</BulletItem>
          <BulletItem>Entrez le nouvel index — la consommation est calculée automatiquement</BulletItem>
          <BulletItem>Signalez une anomalie si nécessaire</BulletItem>
          <BulletItem>Prenez une photo du compteur (optionnel)</BulletItem>
          <BulletItem>Capturez la position GPS (optionnel)</BulletItem>
          <BulletItem>Validez le relevé</BulletItem>

          <SubTitle>5. Déchargement</SubTitle>
          <p>Depuis le <strong className="text-foreground">Tableau de bord</strong>, appuyez sur <strong className="text-foreground">Décharger</strong> pour envoyer tous les relevés au serveur ERP.</p>
        </CollapsibleSection>

        {/* Carte */}
        <CollapsibleSection icon={<MapPin className="w-5 h-5 text-success" />} title="Carte des compteurs" delay={0.1}>
          <p>La carte est visible sur les pages <strong className="text-foreground">Accueil</strong>, <strong className="text-foreground">Tournée</strong> et <strong className="text-foreground">Historique</strong>.</p>
          <BulletItem><span className="text-success font-bold">🟢 Vert</span> : relevé effectué</BulletItem>
          <BulletItem><span className="text-destructive font-bold">🔴 Rouge</span> : en attente de relevé</BulletItem>
          <p>Cliquez sur un marqueur pour voir les infos de l'abonné, puis sur <strong className="text-foreground">"Ouvrir le relevé →"</strong> pour accéder directement à la fiche.</p>
        </CollapsibleSection>

        {/* Modes */}
        <CollapsibleSection icon={<Wifi className="w-5 h-5 text-info" />} title="Modes de fonctionnement" delay={0.15}>
          <SubTitle>Mode Démo (local)</SubTitle>
          <BulletItem>Données fictives intégrées — aucune connexion réseau requise</BulletItem>
          <BulletItem>Idéal pour les tests et démonstrations</BulletItem>

          <SubTitle>Mode Serveur ERP</SubTitle>
          <BulletItem>Connexion réelle au serveur ERP via API REST</BulletItem>
          <BulletItem>Authentification par token sécurisé</BulletItem>

          <p className="mt-2">Basculez entre les modes depuis la page <strong className="text-foreground">Profil → Mode de connexion</strong>.</p>
        </CollapsibleSection>

        {/* Persistance */}
        <CollapsibleSection icon={<Database className="w-5 h-5 text-warning" />} title="Stockage & données" delay={0.2}>
          <p>Les données sont stockées localement sur votre appareil (IndexedDB) et persistent entre les sessions :</p>
          <BulletItem><strong className="text-foreground">Données de tournée</strong> : abonnés, compteurs, anomalies, consommations</BulletItem>
          <BulletItem><strong className="text-foreground">Relevés effectués</strong> : saisies avec index, anomalies, photos, GPS</BulletItem>
          <BulletItem><strong className="text-foreground">Dates de synchronisation</strong> : dernier chargement et déchargement</BulletItem>
          <p className="mt-1">⚠️ Les données sont effacées à la déconnexion.</p>
        </CollapsibleSection>

        {/* Architecture */}
        <CollapsibleSection icon={<Zap className="w-5 h-5 text-primary" />} title="Architecture technique" delay={0.25}>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] leading-relaxed text-foreground">
            <p>┌────────────────────────────────────┐</p>
            <p>│ React 18 + TypeScript + Vite 5 │</p>
            <p>│ Tailwind CSS + shadcn/ui │</p>
            <p>├────────────────────────────────────┤</p>
            <p>│ Context API (état global) │</p>
            <p>│ React Router (navigation) │</p>
            <p>│ Leaflet (cartographie) │</p>
            <p>├────────────────────────────────────┤</p>
            <p>│ IndexedDB (persistance locale) │</p>
            <p>│ API REST (communication ERP) │</p>
            <p>├────────────────────────────────────┤</p>
            <p>│ Capacitor (Android / iOS) │</p>
            <p>│ Caméra + Géolocalisation │</p>
            <p>└────────────────────────────────────┘</p>
          </div>
          <SubTitle>Technologies</SubTitle>
          <div className="grid grid-cols-2 gap-1 mt-1">
            <span>• React 18</span><span>• TypeScript</span>
            <span>• Vite 5</span><span>• Tailwind CSS 3</span>
            <span>• Leaflet</span><span>• Capacitor 8</span>
            <span>• Framer Motion</span><span>• Recharts</span>
            <span>• React Hook Form</span><span>• Zod</span>
          </div>
        </CollapsibleSection>

        {/* Installation */}
        <CollapsibleSection icon={<Download className="w-5 h-5 text-info" />} title="Installation & déploiement" delay={0.3}>
          <SubTitle>Prérequis</SubTitle>
          <BulletItem>Node.js ≥ 18 et npm</BulletItem>
          <BulletItem>Android Studio (pour build Android)</BulletItem>
          <BulletItem>Xcode (pour build iOS, macOS uniquement)</BulletItem>
          <BulletItem>Un serveur ERP accessible avec les endpoints WS configurés</BulletItem>

          <SubTitle>1. Connecter le projet à GitHub</SubTitle>
          <p>Dans l'éditeur Lovable, connectez votre projet à GitHub pour générer un dépôt :</p>
          <BulletItem>Cliquez sur le bouton <strong className="text-foreground">Plus (+)</strong> dans la zone de saisie du chat (en bas à gauche)</BulletItem>
          <BulletItem>Sélectionnez <strong className="text-foreground">GitHub → Connecter le projet</strong></BulletItem>
          <BulletItem>Autorisez l'application Lovable sur GitHub</BulletItem>
          <BulletItem>Choisissez le compte ou l'organisation où créer le repository</BulletItem>
          <BulletItem>Cliquez sur <strong className="text-foreground">Créer le repository</strong> — le code sera automatiquement synchronisé</BulletItem>
          <p className="mt-1">Une fois connecté, la synchronisation est <strong className="text-foreground">bidirectionnelle</strong> : les modifications dans Lovable poussent vers GitHub, et les pushs depuis GitHub se reflètent dans Lovable.</p>

          <SubTitle>2. Récupérer l'URL du dépôt</SubTitle>
          <p>Une fois le repository créé, récupérez son URL :</p>
          <BulletItem>Dans Lovable, allez dans <strong className="text-foreground">Paramètres du projet → GitHub</strong></BulletItem>
          <BulletItem>L'URL du dépôt est affichée (ex: <code className="text-foreground bg-muted px-1 rounded">https://github.com/mon-org/releve-eau-mobile.git</code>)</BulletItem>

          <SubTitle>3. Cloner et installer</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p># Cloner le repository (remplacez par votre URL)</p>
            <p>git clone https://github.com/mon-org/releve-eau-mobile.git</p>
            <p>cd releve-eau-mobile</p>
            <p>npm install</p>
          </div>

          <SubTitle>2. Configuration du serveur WS</SubTitle>
          <p>Créez un fichier <strong className="text-foreground">.env</strong> à la racine du projet :</p>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>VITE_API_BASE_URL=http://&lt;IP_SERVEUR&gt;:&lt;PORT&gt;</p>
            <p># Exemple : http://192.168.1.100:8080</p>
          </div>
          <p className="mt-1">Cette URL est utilisée pour tous les appels REST (authentification, chargement, déchargement).</p>

          <SubTitle>3. Lancer en développement</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>npm run dev</p>
            <p># L'app est accessible sur http://localhost:5173</p>
          </div>

          <SubTitle>4. Build de production</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>npm run build          # Génère le dossier dist/</p>
          </div>

          <SubTitle>5. Build mobile (APK Android)</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>npm run build</p>
            <p>npx cap sync</p>
            <p>npx cap open android   # Ouvre Android Studio</p>
          </div>
          <BulletItem>Dans Android Studio : <strong className="text-foreground">Build → Build Bundle(s) / APK(s) → Build APK(s)</strong></BulletItem>
          <BulletItem>L'APK signé se trouve dans <code className="text-foreground bg-muted px-1 rounded">android/app/build/outputs/apk/</code></BulletItem>
          <BulletItem>Pour un APK de release, configurez la clé de signature dans <code className="text-foreground bg-muted px-1 rounded">build.gradle</code></BulletItem>

          <SubTitle>6. Déploiement sur appareil</SubTitle>
          <BulletItem>Transférez l'APK par câble USB, email ou partage réseau</BulletItem>
          <BulletItem>Activez « Sources inconnues » dans les paramètres Android pour l'installer</BulletItem>
          <BulletItem>L'app fonctionne en mode hors-ligne après installation</BulletItem>
        </CollapsibleSection>

        {/* Chargement & Déchargement WS */}
        <CollapsibleSection icon={<Globe className="w-5 h-5 text-primary" />} title="Chargement & déchargement (serveur WS)" delay={0.32}>
          <SubTitle>Architecture de communication</SubTitle>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] leading-relaxed text-foreground">
            <p>┌──────────────┐    REST/JSON     ┌──────────────┐</p>
            <p>│  App Mobile  │ ◄──────────────► │ Serveur ERP  │</p>
            <p>│  (Capacitor) │                  │  (Web Service)│</p>
            <p>└──────────────┘                  └──────────────┘</p>
          </div>
          <p className="mt-2">L'application communique avec le serveur ERP via des <strong className="text-foreground">API REST en JSON</strong>. L'URL de base est configurable via la variable d'environnement <code className="text-foreground bg-muted px-1 rounded">VITE_API_BASE_URL</code>.</p>

          <SubTitle>🔐 Étape 1 — Authentification</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>POST /api/auth/login</p>
            <p>Body: {"{"} "matricule": "AG001", "password": "****" {"}"}</p>
          </div>
          <BulletItem>Retourne un <strong className="text-foreground">token JWT</strong> utilisé pour sécuriser les appels suivants</BulletItem>
          <BulletItem>Le token est stocké en mémoire (pas de persistance) et envoyé dans le header <code className="text-foreground bg-muted px-1 rounded">Authorization: Bearer &lt;token&gt;</code></BulletItem>
          <BulletItem>En cas d'échec serveur, le <strong className="text-foreground">mode démo</strong> est activé automatiquement</BulletItem>

          <SubTitle>📥 Étape 2 — Chargement (téléchargement des tournées)</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>GET /api/releve/charger</p>
            <p>Header: Authorization: Bearer &lt;token&gt;</p>
          </div>
          <p className="mt-1">Le serveur retourne un <strong className="text-foreground">JSON structuré</strong> contenant :</p>
          <BulletItem><strong className="text-foreground">Tournées (TRN)</strong> : période, année, code secteur, ordre de passage</BulletItem>
          <BulletItem><strong className="text-foreground">Abonnés (ABO)</strong> : numéro point de droit, nom, adresse, coordonnées GPS</BulletItem>
          <BulletItem><strong className="text-foreground">Compteurs (CPT)</strong> : numéro, calibre, marque, ancien index</BulletItem>
          <BulletItem><strong className="text-foreground">Anomalies (ANO_RLV)</strong> : codes et libellés des anomalies possibles</BulletItem>
          <BulletItem><strong className="text-foreground">Annulations (ANN_RLV)</strong> : motifs d'annulation de relevé</BulletItem>
          <BulletItem><strong className="text-foreground">Consommations (CSO_RLV)</strong> : historique des consommations précédentes</BulletItem>
          <p className="mt-1">Les données sont stockées dans <strong className="text-foreground">IndexedDB</strong> pour un accès hors-ligne immédiat.</p>

          <SubTitle>📤 Étape 3 — Déchargement (envoi des relevés)</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>POST /api/releve/decharger</p>
            <p>Header: Authorization: Bearer &lt;token&gt;</p>
            <p>Body: {"{"} "releves": [...], "photos": [...] {"}"}</p>
          </div>
          <p className="mt-1">Chaque relevé envoyé contient :</p>
          <BulletItem><strong className="text-foreground">PER_HIS_RLV / ANN_HIS_RLV</strong> : période et année de la tournée</BulletItem>
          <BulletItem><strong className="text-foreground">NUM_PNT_DRT</strong> : numéro du point de droit (identifiant abonné)</BulletItem>
          <BulletItem><strong className="text-foreground">VAL_IDX_CSO_RLV</strong> : nouvel index du compteur</BulletItem>
          <BulletItem><strong className="text-foreground">COD_ANO_RLV</strong> : code anomalie (si signalée)</BulletItem>
          <BulletItem><strong className="text-foreground">COD_ANN_RLV</strong> : code annulation (si annulé)</BulletItem>
          <BulletItem><strong className="text-foreground">DAT_RLV_CSO_RLV</strong> : date et heure du relevé</BulletItem>
          <BulletItem><strong className="text-foreground">CMT_RLR</strong> : commentaire de l'agent</BulletItem>
          <p className="mt-1">Les <strong className="text-foreground">photos</strong> sont envoyées séparément avec le numéro de point de droit et le timestamp.</p>

          <SubTitle>📊 Réponse du serveur</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>{"{"}</p>
            <p>  "success": true,</p>
            <p>  "acceptedCount": 45,</p>
            <p>  "rejectedCount": 2,</p>
            <p>  "message": "Déchargement terminé"</p>
            <p>{"}"}</p>
          </div>
          <BulletItem>Les relevés acceptés sont marqués <strong className="text-foreground">synced = true</strong> localement</BulletItem>
          <BulletItem>En cas d'erreur réseau, les relevés restent en local et peuvent être renvoyés</BulletItem>

          <SubTitle>⚡ Alternative : Import JSON local</SubTitle>
          <p>Si le serveur WS n'est pas accessible, vous pouvez charger les données depuis un <strong className="text-foreground">fichier JSON</strong> :</p>
          <BulletItem>Allez dans <strong className="text-foreground">Profil → Importer JSON</strong></BulletItem>
          <BulletItem>Le fichier doit respecter la structure attendue (tournées, abonnés, compteurs…)</BulletItem>
          <BulletItem>Le parseur est robuste : insensible à la casse, gère le BOM UTF-8</BulletItem>
          <BulletItem>Idéal pour les tests ou quand le réseau n'est pas disponible</BulletItem>

          <SubTitle>🔄 Flux complet</SubTitle>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-[10px] leading-relaxed text-foreground">
            <p>1. 🔐 Login → Token JWT</p>
            <p>2. 📥 Charger → Tournées + Abonnés en local</p>
            <p>3. 📝 Terrain → Saisie des relevés (hors-ligne)</p>
            <p>4. 📤 Décharger → Envoi au serveur ERP</p>
            <p>5. ✅ Confirmation → Relevés marqués synced</p>
          </div>
        </CollapsibleSection>

        {/* Dépannage GitHub */}
        <CollapsibleSection icon={<Bug className="w-5 h-5 text-destructive" />} title="Dépannage GitHub" delay={0.34}>
          <SubTitle>Erreur : Échec de l'authentification GitHub</SubTitle>
          <p><strong className="text-foreground">Symptôme :</strong> L'écran d'autorisation GitHub se ferme immédiatement ou affiche « Access denied ».</p>
          <p className="mt-1"><strong className="text-foreground">Solutions :</strong></p>
          <BulletItem><strong className="text-foreground">Étape 1 :</strong> Vérifiez que vous êtes connecté à GitHub dans le même navigateur. Allez sur <code className="text-foreground bg-muted px-1 rounded">github.com</code> et connectez-vous si nécessaire.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 2 :</strong> Dans Lovable, ouvrez le <strong className="text-foreground">Plus (+)</strong> du chat → GitHub → <strong className="text-foreground">Reconnecter</strong>. Acceptez toutes les permissions demandées.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 3 :</strong> Si vous utilisez un compte d'organisation, demandez à l'administrateur d'approuver l'application Lovable dans les <strong className="text-foreground">Paramètres → Applications OAuth</strong> de l'organisation.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 4 :</strong> Videz le cache du navigateur (Ctrl+Shift+Suppr / Cmd+Shift+Suppr) et réessayez.</BulletItem>

          <SubTitle>Erreur : Repository introuvable ou URL invalide</SubTitle>
          <p><strong className="text-foreground">Symptôme :</strong> Le <code className="text-foreground bg-muted px-1 rounded">git clone</code> retourne « repository not found » ou une erreur 404.</p>
          <p className="mt-1"><strong className="text-foreground">Solutions :</strong></p>
          <BulletItem><strong className="text-foreground">Étape 1 :</strong> Dans Lovable, allez dans <strong className="text-foreground">Paramètres du projet → GitHub</strong> et copiez exactement l'URL affichée (format <code className="text-foreground bg-muted px-1 rounded">https://github.com/utilisateur/repo.git</code>).</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 2 :</strong> Vérifiez que le repository existe sur GitHub. Si vous voyez une page 404, le repo est peut-être privé ou a été supprimé.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 3 :</strong> Si le repo est privé, assurez-vous d'avoir les droits d'accès. Essayez avec HTTPS + token : remplacez l'URL par <code className="text-foreground bg-muted px-1 rounded">https://TOKEN@github.com/utilisateur/repo.git</code> ou configurez SSH.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 4 :</strong> Si vous avez renommé le projet dans Lovable, l'ancien nom peut encore être référencé. Déconnectez puis reconnectez GitHub pour régénérer le repository.</BulletItem>

          <SubTitle>Erreur : Conflit de branches / synchronisation bloquée</SubTitle>
          <p><strong className="text-foreground">Symptôme :</strong> Les modifications ne se synchronisent plus entre Lovable et GitHub, ou vous voyez des messages de conflit.</p>
          <p className="mt-1"><strong className="text-foreground">Solutions :</strong></p>
          <BulletItem><strong className="text-foreground">Étape 1 :</strong> Vérifiez la branche active. Dans Lovable, la synchronisation se fait sur la branche par défaut (<code className="text-foreground bg-muted px-1 rounded">main</code> ou <code className="text-foreground bg-muted px-1 rounded">master</code>). Ne travaillez pas sur une branche locale sans la lier à Lovable.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 2 :</strong> Si vous avez modifié le code localement et dans Lovable en parallèle, un conflit peut survenir. Ouvrez le terminal dans votre clone local et faites :<br />
            <code className="text-foreground bg-muted px-1 rounded">git pull origin main</code> puis résolvez les conflits manuellement dans les fichiers marqués.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 3 :</strong> En cas de conflit persistant, sauvegardez vos modifications locales (<code className="text-foreground bg-muted px-1 rounded">git stash</code>), forcez la mise à jour depuis Lovable (<code className="text-foreground bg-muted px-1 rounded">git fetch origin &amp;&amp; git reset --hard origin/main</code>), puis réappliquez vos changements.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 4 :</strong> Si la synchronisation est complètement bloquée, allez dans <strong className="text-foreground">Paramètres du projet → GitHub</strong> dans Lovable, cliquez sur <strong className="text-foreground">Déconnecter</strong> puis reconnectez le projet. Le repository GitHub reste intact.</BulletItem>

          <SubTitle>Erreur : Push refusé (Permission denied)</SubTitle>
          <p><strong className="text-foreground">Symptôme :</strong> Vous ne pouvez pas pousser vos modifications locales vers GitHub.</p>
          <p className="mt-1"><strong className="text-foreground">Solutions :</strong></p>
          <BulletItem><strong className="text-foreground">Étape 1 :</strong> Vérifiez que vous avez le rôle <strong className="text-foreground">Write</strong> ou <strong className="text-foreground">Admin</strong> sur le repository GitHub (Settings → Manage access).</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 2 :</strong> Si vous clonez en HTTPS, configurez un <strong className="text-foreground">Personal Access Token (PAT)</strong> : GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → générez un token avec le scope <code className="text-foreground bg-muted px-1 rounded">repo</code>.</BulletItem>
          <BulletItem><strong className="text-foreground">Étape 3 :</strong> Utilisez ce token à la place du mot de passe lors du <code className="text-foreground bg-muted px-1 rounded">git push</code> :<br />
            <code className="text-foreground bg-muted px-1 rounded">git remote set-url origin https://TOKEN@github.com/utilisateur/repo.git</code></BulletItem>

          <SubTitle>Bonnes pratiques</SubTitle>
          <BulletItem>Ne modifiez jamais le même fichier simultanément dans Lovable et dans votre IDE local sans pull/push entre les deux</BulletItem>
          <BulletItem>Faites des commits réguliers et petits pour limiter les conflits</BulletItem>
          <BulletItem>Utilisez <code className="text-foreground bg-muted px-1 rounded">git status</code> avant chaque modification pour vérifier l'état de la branche</BulletItem>
          <BulletItem>Si vous travaillez en équipe, communiquez qui modifie quelle section du code</BulletItem>
        </CollapsibleSection>

        {/* Sécurité */}
        <CollapsibleSection icon={<Lock className="w-5 h-5 text-destructive" />} title="Sécurité & recommandations" delay={0.35}>
          <SubTitle>Sécurité</SubTitle>
          <BulletItem>HTTPS obligatoire pour les communications ERP</BulletItem>
          <BulletItem>Token JWT avec expiration</BulletItem>
          <BulletItem>Aucune clé API privée dans le code source</BulletItem>

          <SubTitle>Évolutions recommandées</SubTitle>
          <BulletItem>Mode hors-ligne complet (Service Worker)</BulletItem>
          <BulletItem>Synchronisation automatique en arrière-plan</BulletItem>
          <BulletItem>Scanner code-barres via caméra (ML Kit / ZXing)</BulletItem>
          <BulletItem>Lecture radio réelle (Bluetooth/NFC)</BulletItem>
          <BulletItem>Export CSV/PDF des relevés</BulletItem>
          <BulletItem>Multi-langue : arabe, anglais, français</BulletItem>
          <BulletItem>Signature tactile de l'agent</BulletItem>
          <BulletItem>Notifications push</BulletItem>
        </CollapsibleSection>

        {/* Version */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl shadow-card border border-border p-4 text-center space-y-1"
        >
          <p className="text-sm font-bold text-foreground">Relève d'Eau Mobile</p>
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-[10px] text-muted-foreground">Capacitor ID: app.lovable.*</p>
          <p className="text-[10px] text-muted-foreground mt-2">© {new Date().getFullYear()} — Tous droits réservés</p>
        </motion.div>
      </div>
    </div>
  );
}
