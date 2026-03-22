import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Droplets, MapPin, AlertTriangle, Map, List, Calendar, Search, X, MapPinOff } from 'lucide-react';
import GPSMap from '@/components/GPSMap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapErrorBoundary from '@/components/MapErrorBoundary';

function createStatusIcon(done: boolean, hasAnomaly: boolean) {
  const color = hasAnomaly ? '#f59e0b' : done ? '#22c55e' : '#ef4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const CONSTANTINE_CENTER: [number, number] = [36.365, 6.615];

export default function TourneePage() {
  const { abonnes, releves, isDataLoaded, tournees, loadedData } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Filter abonnes by search query (hook must be before early return)
  const filteredAbonnes = useMemo(() => {
    if (!searchQuery.trim()) return abonnes;
    const q = searchQuery.toLowerCase().trim();
    return abonnes.filter(abo => {
      return (
        (abo.RAI_SOC_CLI_ABO || '').toLowerCase().includes(q) ||
        (abo.NUM_CTA_ABO || '').toLowerCase().includes(q) ||
        (abo.NUM_PNT_DRT_ABO || '').toLowerCase().includes(q) ||
        (abo.NUM_PHY_APT_ABO || '').toLowerCase().includes(q) ||
        (`${abo.NO_RUE_LIV_ABO} ${abo.NOM_RUE_LIV_ABO || ''}`).toLowerCase().includes(q) ||
        (abo.NOM_COM || '').toLowerCase().includes(q)
      );
    });
  }, [searchQuery, abonnes]);

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <p className="text-muted-foreground">Veuillez charger les données d'abord</p>
      </div>
    );
  }

  const currentTournee = tournees[0];
  const periodLabel = currentTournee?.PER_TRN ? `P${currentTournee.PER_TRN}` : '';
  const yearLabel = currentTournee?.ANN_TRN || '';

  // Group by street
  const streets = filteredAbonnes.reduce((acc, abo) => {
    const street = abo.NOM_RUE_LIV_ABO || 'Autre';
    if (!acc[street]) acc[street] = [];
    acc[street].push(abo);
    return acc;
  }, {} as Record<string, typeof abonnes>);

  // Build markers from releves that have GPS
  const markers = releves
    .filter(r => r.latitude && r.longitude)
    .map(r => {
      const abo = abonnes.find(a => a.NUM_PNT_DRT_ABO === r.NUM_PNT_DRT);
      const isDone = r.VAL_IDX_NOUVEAU !== undefined;
      const hasAnomaly = !!r.COD_ANO_RLV;
      return { ...r, abo, isDone, hasAnomaly };
    });

  // Count abonnes without GPS
  const abonnesWithoutGPS = abonnes.filter(a => {
    const releve = releves.find(r => r.NUM_PNT_DRT === a.NUM_PNT_DRT_ABO);
    return !releve?.latitude || !releve?.longitude;
  });

  const doneTotal = abonnes.filter(a => releves.some(r => r.NUM_PNT_DRT === a.NUM_PNT_DRT_ABO && r.VAL_IDX_NOUVEAU !== undefined)).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border pt-safe px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Tournée {currentTournee?.NUM_TRN}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{periodLabel && yearLabel ? `Période ${currentTournee.PER_TRN} — ${yearLabel}` : `${abonnes.length} compteurs`}</span>
              </div>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{doneTotal}/{abonnes.length} relevés</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
              className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            >
              <Search className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'map' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Client, N° compteur, adresse, commune..."
                autoFocus
                className="w-full h-10 pl-9 pr-9 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-muted-foreground mt-1.5">{filteredAbonnes.length} résultat(s)</p>
            )}
          </motion.div>
        )}
      </div>

      {viewMode === 'map' ? (
        <div className="px-4 py-4">
          <div className="rounded-xl overflow-hidden border border-border shadow-card" style={{ height: 500 }}>
            <MapContainer
              center={markers.length > 0 ? [markers[0].latitude!, markers[0].longitude!] : CONSTANTINE_CENTER}
              zoom={markers.length > 0 ? 15 : 13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {markers.map((m) => (
                <Marker
                  key={m.NUM_PNT_DRT}
                  position={[m.latitude!, m.longitude!]}
                  icon={createStatusIcon(m.isDone, m.hasAnomaly)}
                  eventHandlers={{ click: () => navigate(`/releve/${m.NUM_PNT_DRT}`) }}
                >
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold">{m.abo?.RAI_SOC_CLI_ABO}</p>
                      <p>{m.abo?.NO_RUE_LIV_ABO} {m.abo?.NOM_RUE_LIV_ABO}</p>
                      <p className="font-mono mt-1">Idx: {m.VAL_IDX_NOUVEAU ?? '—'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* GPS unavailable warning */}
          {abonnesWithoutGPS.length > 0 && (
            <div className="mt-3 bg-warning/10 rounded-xl p-3 border border-warning/20">
              <div className="flex items-center gap-2 mb-1.5">
                <MapPinOff className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-warning">{abonnesWithoutGPS.length} compteur(s) sans GPS</span>
              </div>
              <p className="text-xs text-muted-foreground">Ces compteurs n'apparaissent pas sur la carte. Capturez le GPS lors du relevé.</p>
            </div>
          )}

          {markers.length === 0 && (
            <div className="mt-4 bg-card rounded-xl p-4 border border-border text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucune position GPS enregistrée.</p>
              <p className="text-xs text-muted-foreground mt-1">Les compteurs apparaîtront sur la carte après capture GPS lors du relevé.</p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 justify-center text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Relevé OK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>Non relevé</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Anomalie</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {filteredAbonnes.length === 0 && searchQuery && (
            <div className="bg-card rounded-xl p-6 border border-border text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun résultat pour « {searchQuery} »</p>
            </div>
          )}
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
                    const hasGPS = !!(releve?.latitude && releve?.longitude);
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
                          {abo.NOM_COM && <p className="text-xs text-muted-foreground/70">{abo.NOM_COM}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasGPS ? (
                            <MapPin className="w-3.5 h-3.5 text-success" />
                          ) : (
                            <MapPinOff className="w-3.5 h-3.5 text-muted-foreground/40" />
                          )}
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
      )}
    </div>
  );
}
