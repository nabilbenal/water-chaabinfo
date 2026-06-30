import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Droplets, Smartphone, Shield, FileUp, Server, Wifi, CheckCircle, AlertTriangle, HelpCircle, Settings, Loader2, ChevronDown, ChevronUp, Grid3X3, Wrench, MapPin, Cog } from 'lucide-react';
import { toast } from 'sonner';
import { getSoapConfig, saveSoapConfig, testSoapConnection, SOAP_ENV_DEFAULTS, getWsdlUrl, type SoapConfig } from '@/services/soapClient';

export default function ProfilPage() {
  const { agent, logout, releves, lastLoadDate, lastUnloadDate, apiMode, setMode, importJSON, importSDF, loadedData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sdfInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
        const jsonStr = ev.target?.result as string;
        console.log('[Import] Taille fichier:', jsonStr.length, 'caractères');
        console.log('[Import] Aperçu:', jsonStr.substring(0, 500));
        importJSON(jsonStr);
        toast.success('Import réussi', {
          description: `Fichier "${file.name}" importé avec succès`,
        });
      } catch (err) {
        console.error('[Import] Erreur:', err);
        toast.error('Erreur d\'import', {
          description: err instanceof Error ? err.message : 'Fichier JSON invalide',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportSDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importSDF(file);
      toast.success('Import SDF réussi', {
        description: `${file.name} — données extraites avec succès`,
      });
    } catch (err) {
      toast.error('Erreur d\'import SDF', {
        description: err instanceof Error ? err.message : 'Fichier SDF invalide',
      });
    }
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
              Démo
            </button>
            <button
              onClick={() => setMode('api')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${apiMode === 'api' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <Wifi className="w-3 h-3" /> REST
            </button>
            <button
              onClick={() => setMode('soap')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${apiMode === 'soap' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              <Server className="w-3 h-3" /> SOAP
            </button>
          </div>
        </motion.div>

        {/* SOAP Configuration */}
        {apiMode === 'soap' && <SoapConfigPanel />}

        {/* Résumé données chargées */}
        {loadedData && (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-xl shadow-card p-4 border border-success/30 space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" /> Données chargées
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Abonnés: <strong className="text-foreground">{loadedData.abonnes.length}</strong></span>
              <span>Tournées: <strong className="text-foreground">{loadedData.tournees.length}</strong></span>
              <span>Compteurs: <strong className="text-foreground">{loadedData.compteurs.length}</strong></span>
              <span>Anomalies: <strong className="text-foreground">{loadedData.anomalies.length}</strong></span>
              <span>Consommations: <strong className="text-foreground">{loadedData.consommations.length}</strong></span>
            </div>
            {loadedData.abonnes.length === 0 && (
              <p className="text-xs text-warning flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" /> Aucun abonné trouvé — vérifiez les clés du fichier JSON
              </p>
            )}
          </motion.div>
        )}

        {/* Paramétrage PDA SOMEI */}
        {loadedData?.parametragePda && <ParametragePdaPanel parametrage={loadedData.parametragePda} />}

        {/* Import JSON */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          <input ref={sdfInputRef} type="file" accept=".sdf" onChange={handleImportSDF} className="hidden" />
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-card rounded-xl shadow-card p-4 border border-border flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <FileUp className="w-5 h-5 text-info" />
              <span className="text-xs font-medium text-foreground">Import JSON</span>
            </button>
            <button
              onClick={() => sdfInputRef.current?.click()}
              className="flex-1 bg-card rounded-xl shadow-card p-4 border border-primary/30 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
            >
              <FileUp className="w-5 h-5 text-primary" />
              <span className="text-xs font-medium text-foreground">Import SDF</span>
            </button>
          </div>
        </motion.div>

        {/* Aide & À propos */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <button
            onClick={() => navigate('/aide')}
            className="w-full bg-card rounded-xl shadow-card p-4 border border-border flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <HelpCircle className="w-5 h-5 text-primary" />
            <div className="text-left">
              <span className="text-sm font-medium text-foreground block">Aide & À propos</span>
              <span className="text-[11px] text-muted-foreground">Guide d'utilisation, architecture, recommandations</span>
            </div>
          </button>
        </motion.div>

        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
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

function SoapConfigPanel() {
  const existing = getSoapConfig();
  const [serverUrl, setServerUrl] = useState(existing?.serverUrl || SOAP_ENV_DEFAULTS.baseUrl || 'http://10.53.64.61/rec');
  const [clientId, setClientId] = useState(existing?.clientId || SOAP_ENV_DEFAULTS.clientId || '');
  const [accessKey, setAccessKey] = useState(existing?.accessKey || SOAP_ENV_DEFAULTS.accessKey || '');
  const [testing, setTesting] = useState(false);
  const wsdlUrl = getWsdlUrl(serverUrl);
  const hasEnvDefaults = Boolean(SOAP_ENV_DEFAULTS.baseUrl);

  const handleSave = () => {
    saveSoapConfig({ serverUrl, clientId, accessKey });
    toast.success('Configuration SOAP sauvegardée');
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testSoapConnection({ serverUrl, clientId, accessKey });
      if (result.success) {
        toast.success('Connexion SOAP réussie', { description: result.message });
        saveSoapConfig({ serverUrl, clientId, accessKey });
      } else {
        toast.error('Échec connexion SOAP', { description: result.message });
      }
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Erreur inconnue' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="bg-card rounded-xl shadow-card p-4 border border-primary/30 space-y-3">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" /> Configuration SOMEI (SOAP)
      </p>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">URL Serveur</label>
          <input value={serverUrl} onChange={e => setServerUrl(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/30"
            placeholder="http://10.53.64.61/rec" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Client ID</label>
          <input value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/30"
            placeholder="Identifiant SOMEI" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Access Key</label>
          <input type="password" value={accessKey} onChange={e => setAccessKey(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/30"
            placeholder="Mot de passe SOMEI" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-muted text-foreground text-xs font-medium">
          Sauvegarder
        </button>
        <button onClick={handleTest} disabled={testing || !clientId || !accessKey}
          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50">
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
          {testing ? 'Test...' : 'Tester'}
        </button>
      </div>
    </motion.div>
  );
}

function ParametragePdaPanel({ parametrage }: { parametrage: import('@/types/water').ParametragePda }) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (key: string) => setOpenSection(prev => prev === key ? null : key);

  const sections = [
    { key: 'cellules', label: 'Cellules', icon: <Grid3X3 className="w-4 h-4 text-primary" />, data: parametrage.cellules },
    { key: 'familles', label: 'Familles d\'intervention', icon: <Wrench className="w-4 h-4 text-accent" />, data: parametrage.famillesIntervention },
    { key: 'origines', label: 'Origines d\'intervention', icon: <MapPin className="w-4 h-4 text-info" />, data: parametrage.originesIntervention },
    { key: 'types', label: 'Types de moyen', icon: <Cog className="w-4 h-4 text-success" />, data: parametrage.typesMoyen },
  ];

  const totalCount = sections.reduce((sum, s) => sum + s.data.length, 0);
  if (totalCount === 0) return null;

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}
      className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-4 pb-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" /> Paramétrage SOMEI
          <span className="ml-auto text-xs text-muted-foreground">{totalCount} éléments</span>
        </p>
      </div>
      <div className="px-4 pb-4 space-y-1">
        {sections.map(({ key, label, icon, data }) => (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              {icon}
              <span className="text-xs font-medium text-foreground flex-1">{label}</span>
              <span className="text-[11px] text-muted-foreground mr-1">{data.length}</span>
              {openSection === key
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>
            <AnimatePresence>
              {openSection === key && data.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-6 mr-1 mb-2 rounded-lg bg-muted/30 border border-border/50 divide-y divide-border/30 max-h-48 overflow-y-auto">
                    {data.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span className="font-mono text-primary/80 min-w-[3rem]">{item.code}</span>
                        <span className="text-muted-foreground truncate">{item.libelle || '—'}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
