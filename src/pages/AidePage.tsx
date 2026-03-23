import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronRight, Smartphone, MapPin, Camera, Wifi, WifiOff, Database, Shield, Upload, Download, BarChart3, HelpCircle, Info, Zap, FileText, Bug, Globe, Lock } from 'lucide-react';
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
          <BulletItem>Node.js ≥ 18</BulletItem>
          <BulletItem>Android Studio (pour build Android)</BulletItem>
          <BulletItem>Xcode (pour build iOS, macOS uniquement)</BulletItem>

          <SubTitle>Installation</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>git clone &lt;URL_DU_DEPOT&gt;</p>
            <p>cd &lt;NOM_DU_PROJET&gt;</p>
            <p>npm install</p>
            <p>npm run dev</p>
          </div>

          <SubTitle>Build mobile</SubTitle>
          <div className="bg-muted/50 rounded-lg p-2 font-mono text-[10px] text-foreground space-y-1">
            <p>npm run build</p>
            <p>npx cap sync</p>
            <p>npx cap open android</p>
          </div>
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
