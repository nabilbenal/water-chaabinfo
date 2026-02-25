import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Droplets, MapPin, AlertTriangle } from 'lucide-react';

export default function TourneePage() {
  const { abonnes, releves, isDataLoaded } = useApp();
  const navigate = useNavigate();

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <p className="text-muted-foreground">Veuillez charger les données d'abord</p>
      </div>
    );
  }

  // Group by street
  const streets = abonnes.reduce((acc, abo) => {
    const street = abo.NOM_RUE_LIV_ABO || 'Autre';
    if (!acc[street]) acc[street] = [];
    acc[street].push(abo);
    return acc;
  }, {} as Record<string, typeof abonnes>);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border pt-safe px-4 pt-4 pb-4">
        <h1 className="text-xl font-bold text-foreground">Tournée</h1>
        <p className="text-sm text-muted-foreground">{abonnes.length} compteurs à relever</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {Object.entries(streets).map(([street, abos], idx) => {
          const doneCount = abos.filter(a => releves.some(r => r.NUM_PNT_DRT === a.NUM_PNT_DRT_ABO && r.VAL_IDX_NOUVEAU !== undefined)).length;
          return (
            <motion.div
              key={street}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground flex-1">{street}</h2>
                <span className="text-xs text-muted-foreground">{doneCount}/{abos.length}</span>
              </div>
              <div className="space-y-2">
                {abos.sort((a, b) => a.ORDRE - b.ORDRE).map((abo) => {
                  const releve = releves.find(r => r.NUM_PNT_DRT === abo.NUM_PNT_DRT_ABO);
                  const isDone = !!releve?.VAL_IDX_NOUVEAU;
                  const hasAnomaly = !!releve?.COD_ANO_RLV;
                  return (
                    <button
                      key={abo.NUM_PNT_DRT_ABO}
                      onClick={() => navigate(`/releve/${abo.NUM_PNT_DRT_ABO}`)}
                      className="w-full bg-card rounded-xl shadow-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform border border-border text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                        {abo.ORDRE}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{abo.RAI_SOC_CLI_ABO}</p>
                        <p className="text-xs text-muted-foreground">N°{abo.NO_RUE_LIV_ABO} · {abo.NUM_CTA_ABO}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasAnomaly && <AlertTriangle className="w-4 h-4 text-warning" />}
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        ) : (
                          <Droplets className="w-5 h-5 text-primary/40" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
