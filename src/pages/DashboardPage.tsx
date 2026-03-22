import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Upload, MapPin, AlertTriangle, CheckCircle2, Clock, Droplets, Loader2 } from 'lucide-react';
import MeterStatusMap from '@/components/MeterStatusMap';

export default function DashboardPage() {
  const { agent, loadData, unloadData, getStats, isLoading, isDataLoaded, lastLoadDate, lastUnloadDate, abonnes, releves } = useApp();
  const navigate = useNavigate();
  const stats = getStats();

  const formatDate = (d: string | null) => {
    if (!d) return 'Jamais';
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const progress = stats.total > 0 ? Math.round((stats.completes / stats.total) * 100) : 0;
  const unsyncedCount = releves.filter(r => !r.synced).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero pt-safe px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary-foreground/70 text-sm">Bonjour,</p>
            <h1 className="text-xl font-bold text-primary-foreground">{agent?.prenom} {agent?.nom}</h1>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Droplets className="w-4 h-4 text-primary-foreground" />
            <span className="text-xs font-medium text-primary-foreground">TRN {agent?.tournee}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-primary-foreground/80">Progression</span>
            <span className="text-lg font-bold text-primary-foreground">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-primary-foreground rounded-full"
            />
          </div>
          <p className="text-xs text-primary-foreground/60 mt-1">{stats.completes}/{stats.total} compteurs relevés</p>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Complétés" value={stats.completes} color="text-success" bg="bg-success/10" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="En attente" value={stats.enAttente} color="text-info" bg="bg-info/10" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Anomalies" value={stats.anomalies} color="text-warning" bg="bg-warning/10" />
          <StatCard icon={<MapPin className="w-5 h-5" />} label="Total" value={stats.total} color="text-primary" bg="bg-primary/10" />
        </motion.div>

        {/* Load / Unload */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={loadData}
            disabled={isLoading}
            className="bg-card rounded-xl shadow-card p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform border border-border"
          >
            {isLoading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Download className="w-8 h-8 text-primary" />}
            <span className="text-sm font-semibold text-foreground">Charger</span>
            <span className="text-[10px] text-muted-foreground">{formatDate(lastLoadDate)}</span>
          </button>
          <button
            onClick={unloadData}
            disabled={isLoading || unsyncedCount === 0}
            className="bg-card rounded-xl shadow-card p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform border border-border"
          >
            {isLoading ? <Loader2 className="w-8 h-8 text-accent animate-spin" /> : <Upload className="w-8 h-8 text-accent" />}
            <span className="text-sm font-semibold text-foreground">Décharger</span>
            <span className="text-[10px] text-muted-foreground">
              {unsyncedCount > 0 ? `${unsyncedCount} en attente` : formatDate(lastUnloadDate)}
            </span>
          </button>
        </motion.div>

        {/* Quick list */}
        {isDataLoaded && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Compteurs à relever</h2>
              <button onClick={() => navigate('/tournee')} className="text-sm text-primary font-medium">Voir tout</button>
            </div>
            <div className="space-y-2">
              {abonnes.slice(0, 4).map((abo) => {
                const releve = releves.find(r => r.NUM_PNT_DRT === abo.NUM_PNT_DRT_ABO);
                const isDone = !!releve?.VAL_IDX_NOUVEAU;
                return (
                  <button
                    key={abo.NUM_PNT_DRT_ABO}
                    onClick={() => navigate(`/releve/${abo.NUM_PNT_DRT_ABO}`)}
                    className="w-full bg-card rounded-xl shadow-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform border border-border text-left"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-success/10' : 'bg-primary/10'}`}>
                      {isDone ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Droplets className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{abo.RAI_SOC_CLI_ABO}</p>
                      <p className="text-xs text-muted-foreground truncate">{abo.NO_RUE_LIV_ABO} {abo.NOM_RUE_LIV_ABO}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-mono text-muted-foreground">{abo.NUM_CTA_ABO}</p>
                      <p className="text-xs text-muted-foreground">Idx: {abo.VAL_IDX_CSO_ANC_ABO}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {!isDataLoaded && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card rounded-xl shadow-card p-8 flex flex-col items-center text-center border border-border"
          >
            <Download className="w-12 h-12 text-primary/30 mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">Aucune donnée chargée</h3>
            <p className="text-sm text-muted-foreground mb-4">Chargez les données de la tournée pour commencer la relève</p>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-semibold active:scale-[0.97] transition-transform"
            >
              {isLoading ? 'Chargement...' : 'Charger la tournée'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-card rounded-xl shadow-card p-3.5 border border-border">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-2 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
