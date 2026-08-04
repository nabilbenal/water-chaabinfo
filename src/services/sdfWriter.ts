/**
 * Conversion JSON -> SDF (déchargement).
 *
 * Le format SDF binaire natif (SQL Server Compact) n'est pas générable côté client.
 * On produit donc un fichier .sdf "table-oriented" encodé en UTF-8 avec BOM,
 * structuré table par table (ABO, CSO_RLV, ...) — format accepté en import par l'ERP.
 */

import type { LoadedData, ReleveLocal, ReleveConsommation } from '@/types/water';

export interface SdfExportPayload {
  meta: {
    generatedAt: string;
    generator: string;
    version: string;
    terminal?: string;
    tournee?: string;
    periode?: number;
    annee?: number;
  };
  tables: Record<string, unknown[]>;
}

/** Construit le payload SDF à partir des données chargées et des relevés locaux. */
export function buildSdfPayload(
  loadedData: LoadedData | null,
  releves: ReleveLocal[],
  options: { terminal?: string; tournee?: string } = {}
): SdfExportPayload {
  const trn = loadedData?.tournees?.[0];
  const periode = trn?.PER_TRN ?? (new Date().getMonth() < 6 ? 1 : 2);
  const annee = trn?.ANN_TRN ?? new Date().getFullYear();

  const csoRlv: ReleveConsommation[] = releves
    .filter((r) => r.VAL_IDX_NOUVEAU !== undefined || r.COD_ANO_RLV)
    .map((r) => ({
      PER_HIS_RLV: periode,
      ANN_HIS_RLV: annee,
      NUM_PNT_DRT: r.NUM_PNT_DRT,
      COD_ANO_RLV: r.COD_ANO_RLV,
      COD_ANN_RLV: r.COD_ANN_RLV,
      DAT_RLV_CSO_RLV: r.dateReleve,
      VAL_IDX_CSO_RLV: r.VAL_IDX_NOUVEAU,
      CMT_RLR: r.commentaire,
    }));

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      generator: 'SEACO - Relève d\'Eau',
      version: '1.0',
      terminal: options.terminal,
      tournee: options.tournee || trn?.NUM_TRN,
      periode,
      annee,
    },
    // Noms de tables et de colonnes strictement conformes au schéma PocketRelevé
    tables: {
      TRN: loadedData?.tournees ?? [],
      ABO: loadedData?.abonnes ?? [],
      APT: loadedData?.compteurs ?? [],
      ELT_APT: loadedData?.elementsCompteur ?? [],
      PNT_DRT: loadedData?.pointsDroit ?? [],
      ANO_RLV: loadedData?.anomalies ?? [],
      ANN_RLV: loadedData?.annulations ?? [],
      ACB_APT: loadedData?.accessibilites ?? [],
      MDL_APT: loadedData?.modeles ?? [],
      PRT_PNT_DRT: loadedData?.portes ?? [],
      PAR: loadedData?.parametres ?? [],
      CSO: loadedData?.consommations ?? [],
      CSO_RLV: csoRlv,
      PHOTO_RLV: releves
        .filter((r) => r.photoUri)
        .map((r) => ({ NUM_PNT_DRT: r.NUM_PNT_DRT, DAT_PHO: r.dateReleve, PHOTO: r.photoUri })),
    },
  };
}

/** Sérialise le payload en Blob .sdf (UTF-8 avec BOM). */
export function toSdfBlob(payload: SdfExportPayload): Blob {
  const json = JSON.stringify(payload, null, 0);
  return new Blob(['\uFEFF' + json], { type: 'application/octet-stream' });
}

export function sdfFileName(payload: SdfExportPayload): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  return `RLV_TRN${payload.meta.tournee ?? '00'}_${stamp}.sdf`;
}

/** Déclenche le téléchargement du fichier .sdf généré. */
export function downloadSdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Conversion complète JSON -> SDF + téléchargement. Retourne le nom du fichier. */
export function exportSdf(
  loadedData: LoadedData | null,
  releves: ReleveLocal[],
  options: { terminal?: string; tournee?: string } = {}
): string {
  const payload = buildSdfPayload(loadedData, releves, options);
  const name = sdfFileName(payload);
  downloadSdf(toSdfBlob(payload), name);
  return name;
}
