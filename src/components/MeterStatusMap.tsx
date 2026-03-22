import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Abonne, ReleveLocal } from '@/types/water';

const CONSTANTINE_CENTER: [number, number] = [36.365, 6.615];

function createStatusIcon(done: boolean) {
  const color = done ? '#22c55e' : '#ef4444';
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

// Generate a deterministic pseudo-random offset from a string seed
function seedOffset(seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const lat = ((h & 0xffff) / 0xffff - 0.5) * 0.06;
  const lng = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.08;
  return [CONSTANTINE_CENTER[0] + lat, CONSTANTINE_CENTER[1] + lng];
}

interface MeterStatusMapProps {
  abonnes: Abonne[];
  releves: ReleveLocal[];
  height?: number;
  className?: string;
}

export default function MeterStatusMap({ abonnes, releves, height = 220, className = '' }: MeterStatusMapProps) {
  const markers = useMemo(() => {
    return abonnes.map(abo => {
      const releve = releves.find(r => r.NUM_PNT_DRT === abo.NUM_PNT_DRT_ABO);
      const done = !!releve?.VAL_IDX_NOUVEAU;
      // Use releve GPS if available, otherwise generate deterministic position
      const lat = releve?.latitude;
      const lng = releve?.longitude;
      const pos: [number, number] = lat && lng ? [lat, lng] : seedOffset(abo.NUM_PNT_DRT_ABO);
      return { abo, done, pos };
    });
  }, [abonnes, releves]);

  const doneCount = markers.filter(m => m.done).length;
  const pendingCount = markers.length - doneCount;

  if (markers.length === 0) return null;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border shadow-card ${className}`} style={{ height }}>
      <MapContainer
        center={CONSTANTINE_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {markers.map(({ abo, done, pos }) => (
          <Marker key={abo.NUM_PNT_DRT_ABO} position={pos} icon={createStatusIcon(done)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{abo.RAI_SOC_CLI_ABO}</p>
                <p>{abo.NO_RUE_LIV_ABO} {abo.NOM_RUE_LIV_ABO}</p>
                <p className={done ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {done ? '✓ Relevé' : '✗ En attente'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[1000] bg-card/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-3 text-[10px] border border-border">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> Relevé ({doneCount})</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block" /> En attente ({pendingCount})</span>
      </div>
    </div>
  );
}
