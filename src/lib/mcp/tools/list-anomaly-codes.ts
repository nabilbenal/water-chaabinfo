import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Référentiel public des codes d'anomalie SEACO utilisés pendant la relève
 * d'eau. Ces codes sont publics (documentation métier) et ne contiennent
 * aucune donnée d'abonné.
 */
const ANOMALIE_CODES = [
  { code: "01", libelle: "Compteur inaccessible" },
  { code: "02", libelle: "Absent avis de passage laissé" },
  { code: "03", libelle: "Compteur bloqué" },
  { code: "04", libelle: "Compteur cassé" },
  { code: "05", libelle: "Compteur illisible / embué" },
  { code: "06", libelle: "Fuite après compteur" },
  { code: "07", libelle: "Fuite avant compteur" },
  { code: "08", libelle: "Compteur déposé" },
  { code: "09", libelle: "Compteur inversé" },
  { code: "10", libelle: "Chien / accès dangereux" },
  { code: "11", libelle: "Local fermé" },
  { code: "12", libelle: "Compteur noyé" },
  { code: "13", libelle: "Point de livraison introuvable" },
  { code: "14", libelle: "Numéro de compteur non conforme" },
  { code: "15", libelle: "Consommation anormalement élevée" },
  { code: "16", libelle: "Consommation nulle" },
  { code: "17", libelle: "Compteur remplacé" },
  { code: "18", libelle: "Immeuble démoli / vacant" },
];

const ANNULATION_CODES = [
  { code: "A1", libelle: "Erreur de saisie" },
  { code: "A2", libelle: "Doublon de relève" },
  { code: "A3", libelle: "Mauvais abonné" },
];

export default defineTool({
  name: "list_reference_codes",
  title: "Lister les codes de référence",
  description:
    "Retourne les codes d'anomalie et d'annulation utilisés lors de la relève des compteurs d'eau SEACO.",
  inputSchema: {
    type: z
      .enum(["anomalie", "annulation", "all"])
      .default("all")
      .describe("Type de codes à retourner"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ type }) => {
    const payload: Record<string, unknown> = {};
    if (type === "anomalie" || type === "all") payload.anomalies = ANOMALIE_CODES;
    if (type === "annulation" || type === "all") payload.annulations = ANNULATION_CODES;
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
