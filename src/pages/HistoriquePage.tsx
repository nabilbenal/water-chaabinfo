import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import MeterStatusMap from '@/components/MeterStatusMap';

export default function HistoriquePage() {
  const { releves, abonnes } = useApp();

  const sorted = [...releves].sort((a, b) => new Date(b.dateReleve).getTime() - new Date(a.dateReleve).getTime());

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border pt-safe px-4 pt-4 pb-4">
        <h1 className="text-xl font-bold text-foreground">Historique</h1>
        <p className="text-sm text-muted-foreground">{releves.length} relevé(s) effectué(s)</p>
      </div>

      {abonnes.length > 0 && (
        <div className="px-4 pt-4">
          <MeterStatusMap abonnes={abonnes} releves={releves} height={200} />
        </div>
      )}

      <div className="px-4 py-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucune relève effectuée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((releve, idx) => (
              <motion.div
                key={releve.id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl shadow-card p-3 border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${releve.COD_ANO_RLV ? 'bg-warning/10' : 'bg-success/10'}`}>
                    {releve.COD_ANO_RLV ? <AlertTriangle className="w-4 h-4 text-warning" /> : <CheckCircle2 className="w-4 h-4 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{releve.RAI_SOC}</p>
                    <p className="text-xs text-muted-foreground">{releve.adresse}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {releve.VAL_IDX_NOUVEAU !== undefined && (
                        <span className="text-xs font-mono text-foreground">
                          {releve.VAL_IDX_ANCIEN} → <span className="font-bold">{releve.VAL_IDX_NOUVEAU}</span>
                        </span>
                      )}
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{releve.methode}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(releve.dateReleve).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {releve.synced ? (
                      <Wifi className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
