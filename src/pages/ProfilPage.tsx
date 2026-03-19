import React, { useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { User, LogOut, Droplets, Smartphone, Shield, FileUp, Server, Wifi } from 'lucide-react';

export default function ProfilPage() {
  const { agent, logout, releves, lastLoadDate, lastUnloadDate, apiMode, setMode, importJSON } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (d: string | null) => {
    if (!d) return 'Jamais';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importJSON(ev.target?.result as string);
      } catch (err) {
        alert('Erreur: fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-hero pt-safe px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">{agent?.prenom} {agent?.nom}</h1>
          <p className="text-sm text-primary-foreground/70">{agent?.matricule}</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card rounded-xl shadow-card p-4 border border-border space-y-3">
          <InfoRow icon={<Droplets className="w-4 h-4 text-primary" />} label="Tournée" value={`TRN ${agent?.tournee}`} />
          <InfoRow icon={<Shield className="w-4 h-4 text-accent" />} label="Relevés effectués" value={releves.length.toString()} />
          <InfoRow icon={<Smartphone className="w-4 h-4 text-info" />} label="Dernier chargement" value={formatDate(lastLoadDate)} />
          <InfoRow icon={<Smartphone className="w-4 h-4 text-success" />} label="Dernier déchargement" value={formatDate(lastUnloadDate)} />
        </motion.div>

        {/* Mode API */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-xl shadow-card p-4 border border-border">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Mode de connexion
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('mock')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${apiMode === 'mock' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Démo (local)
            </button>
            <button
              onClick={() => setMode('api')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${apiMode === 'api' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <Wifi className="w-3 h-3" /> Serveur ERP
            </button>
          </div>
        </motion.div>

        {/* Import JSON */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-card rounded-xl shadow-card p-4 border border-border flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <FileUp className="w-5 h-5 text-info" />
            <div className="text-left">
              <span className="text-sm font-medium text-foreground block">Importer fichier JSON</span>
              <span className="text-[11px] text-muted-foreground">Charger les données exportées depuis le serveur</span>
            </div>
          </button>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <button
            onClick={logout}
            className="w-full bg-card rounded-xl shadow-card p-4 border border-border flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <LogOut className="w-5 h-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">Se déconnecter</span>
          </button>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground pt-4">Relève d'Eau Mobile v1.0</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
