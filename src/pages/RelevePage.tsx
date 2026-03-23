import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, ScanBarcode, Keyboard, MapPin, AlertTriangle, CheckCircle2, ChevronDown, X, Tag, Plus, MessageSquare } from 'lucide-react';
import { takePhoto, getCurrentPosition } from '@/services/native';
import GPSMap from '@/components/GPSMap';
import type { Annotation } from '@/types/water';

const PREDEFINED_TAGS = [
  'Compteur endommagé',
  'Accès difficile',
  'Fuite visible',
  'Compteur inversé',
  'Cadran embué',
  'Compteur bloqué',
  'Chien dangereux',
  'Absent',
  'Compteur enterré',
  'Environnement insalubre',
];

export default function RelevePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { abonnes, releves, anomalies, annulations, addReleve, loadedData } = useApp();

  const abo = abonnes.find(a => a.NUM_PNT_DRT_ABO === id);
  const existingReleve = releves.find(r => r.NUM_PNT_DRT === id);
  const consommation = loadedData?.consommations.find(c => c.NUM_PNT_DRT_CSO === id);

  const [indexValue, setIndexValue] = useState(existingReleve?.VAL_IDX_NOUVEAU?.toString() || '');
  const [selectedAnomaly, setSelectedAnomaly] = useState(existingReleve?.COD_ANO_RLV || '');
  const [comment, setComment] = useState(existingReleve?.commentaire || '');
  const [method, setMethod] = useState<'manuel' | 'scanner' | 'radio'>(existingReleve?.methode || 'manuel');
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(existingReleve?.photoUri || null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Annotations state
  const [annotations, setAnnotations] = useState<Annotation[]>(existingReleve?.annotations || []);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [customAnnotation, setCustomAnnotation] = useState('');

  const ancienIndex = abo?.VAL_IDX_CSO_ANC_ABO || 0;
  const newIndex = parseInt(indexValue) || 0;
  const consumption = newIndex > ancienIndex ? newIndex - ancienIndex : 0;

  const validation = useMemo(() => {
    if (!indexValue) return null;
    if (newIndex < ancienIndex) return { type: 'error' as const, msg: 'Index inférieur à l\'ancien index' };
    if (abo?.VOL_CSO_MAX_ABO && consumption > abo.VOL_CSO_MAX_ABO) return { type: 'warning' as const, msg: `Consommation anormalement élevée (>${abo.VOL_CSO_MAX_ABO} m³)` };
    if (consumption === 0 && newIndex === ancienIndex) return { type: 'warning' as const, msg: 'Consommation nulle' };
    return { type: 'ok' as const, msg: `${consumption} m³ consommés` };
  }, [indexValue, newIndex, ancienIndex, consumption, abo]);

  if (!abo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Abonné non trouvé</p>
      </div>
    );
  }

  const addAnnotation = (tag: string, texte?: string) => {
    // Don't add duplicate tags
    if (annotations.some(a => a.tag === tag && !texte)) return;
    const annotation: Annotation = {
      id: `ANN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tag,
      texte,
      timestamp: new Date().toISOString(),
    };
    setAnnotations(prev => [...prev, annotation]);
  };

  const removeAnnotation = (annId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annId));
  };

  const handleAddCustom = () => {
    const text = customAnnotation.trim();
    if (!text) return;
    addAnnotation('Note', text);
    setCustomAnnotation('');
  };

  const handleSave = () => {
    const releve: import('@/types/water').ReleveLocal = {
      id: `RLV-${id}-${Date.now()}`,
      NUM_PNT_DRT: id!,
      NUM_CTA: abo.NUM_CTA_ABO || '',
      RAI_SOC: abo.RAI_SOC_CLI_ABO || '',
      adresse: `${abo.NO_RUE_LIV_ABO} ${abo.NOM_RUE_LIV_ABO || ''}`,
      VAL_IDX_ANCIEN: ancienIndex,
      VAL_IDX_NOUVEAU: newIndex || undefined,
      COD_ANO_RLV: selectedAnomaly || undefined,
      commentaire: comment || undefined,
      photoUri: photoUri || undefined,
      latitude: gpsCoords?.latitude,
      longitude: gpsCoords?.longitude,
      dateReleve: new Date().toISOString(),
      synced: false,
      methode: method,
      annotations: annotations.length > 0 ? annotations : undefined,
    };
    addReleve(releve);
    setSaved(true);
    setTimeout(() => navigate(-1), 800);
  };

  const handleScanSimulation = () => {
    setMethod('scanner');
    const simulatedIndex = ancienIndex + Math.floor(Math.random() * 150) + 10;
    setIndexValue(simulatedIndex.toString());
  };

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) setPhotoUri(uri);
  };

  const handleGetGPS = async () => {
    setGpsLoading(true);
    const coords = await getCurrentPosition();
    if (coords) setGpsCoords(coords);
    setGpsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-card border-b border-border pt-safe px-4 pt-3 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-lg active:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{abo.RAI_SOC_CLI_ABO}</h1>
          <p className="text-xs text-muted-foreground">{abo.NUM_CTA_ABO} · PDR: {id}</p>
        </div>
        {saved && <CheckCircle2 className="w-6 h-6 text-success animate-fade-in" />}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card rounded-xl shadow-card p-4 border border-border">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Adresse</p>
              <p className="font-medium text-foreground">{abo.NO_RUE_LIV_ABO} {abo.NOM_RUE_LIV_ABO}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commune</p>
              <p className="font-medium text-foreground">{abo.NOM_COM}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ancien Index</p>
              <p className="font-mono font-bold text-foreground text-lg">{ancienIndex}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diamètre</p>
              <p className="font-medium text-foreground">{abo.DIA_APT_ABO} mm</p>
            </div>
            {consommation && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Dern. consommation</p>
                  <p className="font-medium text-foreground">{consommation.VOL_CSO_EAU_CSO} m³</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dern. relève</p>
                  <p className="font-medium text-foreground">{new Date(consommation.DAT_RLV_ABT_CSO).toLocaleDateString('fr-FR')}</p>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Reading Methods */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-medium text-muted-foreground mb-2">Méthode de saisie</p>
          <div className="grid grid-cols-3 gap-2">
            <MethodButton icon={<Keyboard className="w-5 h-5" />} label="Manuel" active={method === 'manuel'} onClick={() => setMethod('manuel')} />
            <MethodButton icon={<ScanBarcode className="w-5 h-5" />} label="Scanner" active={method === 'scanner'} onClick={handleScanSimulation} />
            <MethodButton icon={<MapPin className="w-5 h-5" />} label="Radio" active={method === 'radio'} onClick={() => setMethod('radio')} />
          </div>
        </motion.div>

        {/* Index Input */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl shadow-card p-4 border border-border">
          <label className="block text-sm font-medium text-foreground mb-2">Nouvel Index</label>
          <input
            type="number"
            inputMode="numeric"
            value={indexValue}
            onChange={e => setIndexValue(e.target.value)}
            placeholder="Saisir l'index..."
            className="w-full h-14 px-4 rounded-lg border border-border bg-background text-foreground text-xl font-mono font-bold placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-center"
          />
          {validation && (
            <div className={`mt-3 flex items-center gap-2 text-sm ${
              validation.type === 'error' ? 'text-destructive' : 
              validation.type === 'warning' ? 'text-warning' : 'text-success'
            }`}>
              {validation.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{validation.msg}</span>
            </div>
          )}
        </motion.div>

        {/* Anomaly */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <button
            onClick={() => setShowAnomalies(!showAnomalies)}
            className="w-full bg-card rounded-xl shadow-card p-3 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-foreground">
                {selectedAnomaly ? anomalies.find(a => a.COD_ANO_RLV === selectedAnomaly)?.LIB_ANO_RLV : 'Signaler une anomalie'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAnomalies ? 'rotate-180' : ''}`} />
          </button>
          {showAnomalies && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-2 space-y-1">
              <button
                onClick={() => { setSelectedAnomaly(''); setShowAnomalies(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!selectedAnomaly ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
              >
                Aucune anomalie
              </button>
              {anomalies.filter(a => a.COD_ANO_RLV !== '00' && a.COD_ANO_RLV !== '01').map(ano => (
                <button
                  key={ano.COD_ANO_RLV}
                  onClick={() => { setSelectedAnomaly(ano.COD_ANO_RLV); setShowAnomalies(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedAnomaly === ano.COD_ANO_RLV ? 'bg-warning/10 text-warning font-medium' : 'text-foreground hover:bg-muted'}`}
                >
                  {ano.LIB_ANO_RLV}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Annotations */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.22 }}>
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="w-full bg-card rounded-xl shadow-card p-3 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Annotations {annotations.length > 0 && `(${annotations.length})`}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAnnotations ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showAnnotations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 bg-card rounded-xl border border-border p-3 space-y-3 overflow-hidden"
              >
                {/* Active annotations */}
                {annotations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {annotations.map(ann => (
                      <span
                        key={ann.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {ann.tag}{ann.texte ? `: ${ann.texte}` : ''}
                        <button onClick={() => removeAnnotation(ann.id)} className="ml-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Predefined tags */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Tags rapides</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PREDEFINED_TAGS.map(tag => {
                      const isActive = annotations.some(a => a.tag === tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => isActive ? removeAnnotation(annotations.find(a => a.tag === tag)!.id) : addAnnotation(tag)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom annotation */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MessageSquare className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={customAnnotation}
                      onChange={e => setCustomAnnotation(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                      placeholder="Note personnalisée..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    onClick={handleAddCustom}
                    disabled={!customAnnotation.trim()}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Photo & GPS */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="space-y-2">
          {photoUri ? (
            <div className="relative bg-card rounded-xl shadow-card border border-border overflow-hidden">
              <img src={photoUri} alt="Photo compteur" className="w-full h-40 object-cover" />
              <button onClick={() => setPhotoUri(null)} className="absolute top-2 right-2 w-7 h-7 bg-foreground/60 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          ) : (
            <button onClick={handleTakePhoto} className="w-full bg-card rounded-xl shadow-card p-4 border border-border border-dashed flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
              <Camera className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary">Prendre une photo</span>
            </button>
          )}
          <button onClick={handleGetGPS} disabled={gpsLoading} className="w-full bg-card rounded-xl shadow-card p-3 border border-border flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2">
              <MapPin className={`w-4 h-4 ${gpsCoords ? 'text-success' : 'text-primary'}`} />
              <span className="text-sm font-medium text-foreground">
                {gpsLoading ? 'Localisation...' : gpsCoords ? `${gpsCoords.latitude.toFixed(5)}, ${gpsCoords.longitude.toFixed(5)}` : 'Capturer la position GPS'}
              </span>
            </div>
            {gpsCoords && <CheckCircle2 className="w-4 h-4 text-success" />}
          </button>
          {gpsCoords && (
            <GPSMap
              latitude={gpsCoords.latitude}
              longitude={gpsCoords.longitude}
              isOk={!selectedAnomaly && validation?.type !== 'error'}
              label={abo.RAI_SOC_CLI_ABO}
            />
          )}
        </motion.div>

        {/* Comment */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Commentaire (optionnel)..."
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
        </motion.div>

        {/* Save */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
          <button
            onClick={handleSave}
            disabled={(!indexValue && !selectedAnomaly) || saved}
            className="w-full h-14 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-base disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {saved ? '✓ Enregistré' : 'Valider la relève'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function MethodButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-[0.95] ${
        active ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
