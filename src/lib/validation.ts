import { z } from 'zod';

// Login validation schema
export const loginSchema = z.object({
  matricule: z.string()
    .trim()
    .min(1, 'Le matricule est requis')
    .max(50, 'Matricule trop long (max 50 caractères)'),
  password: z.string()
    .min(1, 'Le mot de passe est requis')
    .max(100, 'Mot de passe trop long (max 100 caractères)'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// JSON import validation — validates the structure of imported data
const abonneSchema = z.object({
  NUM_TRN_ABO: z.string(),
  NUM_SEC_LIV_ABO: z.string(),
  NUM_RUE_TRN_ABO: z.string(),
  NUM_TRC_RUE_TRN_ABO: z.number(),
  NO_RUE_LIV_ABO: z.number(),
  NO_ETG_LIV_ABO: z.number(),
  NUM_SEC_RGR_ABO: z.string(),
  NUM_PNT_DRT_ABO: z.string(),
  ORDRE: z.number(),
}).passthrough();

const tourneeSchema = z.object({
  NUM_TRN: z.string(),
}).passthrough();

export const loadedDataSchema = z.object({
  abonnes: z.array(abonneSchema).default([]),
  tournees: z.array(tourneeSchema).default([]),
  compteurs: z.array(z.record(z.unknown())).default([]),
  anomalies: z.array(z.record(z.unknown())).default([]),
  annulations: z.array(z.record(z.unknown())).default([]),
  accessibilites: z.array(z.record(z.unknown())).default([]),
  modeles: z.array(z.record(z.unknown())).default([]),
  portes: z.array(z.record(z.unknown())).default([]),
  consommations: z.array(z.record(z.unknown())).default([]),
  parametres: z.array(z.record(z.unknown())).default([]),
  elementsCompteur: z.array(z.record(z.unknown())).default([]),
  pointsDroit: z.array(z.record(z.unknown())).default([]),
});
