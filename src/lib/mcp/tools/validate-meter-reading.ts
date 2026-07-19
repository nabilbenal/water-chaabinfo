import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Outil utilitaire : valide un nouvel index de compteur d'eau par rapport
 * à l'ancien index. Calcule la consommation, détecte les cas suspects
 * (index régressif, consommation nulle, consommation anormalement élevée).
 *
 * Fonctionne uniquement sur les valeurs fournies en entrée — aucune
 * donnée d'abonné n'est lue.
 */
export default defineTool({
  name: "validate_meter_reading",
  title: "Valider un relevé de compteur",
  description:
    "Compare un nouvel index à l'ancien, calcule la consommation en m³ et signale les anomalies probables (retour arrière, consommation nulle, dépassement de seuil).",
  inputSchema: {
    ancienIndex: z.number().nonnegative().describe("Ancien index en m³"),
    nouvelIndex: z.number().nonnegative().describe("Nouvel index relevé en m³"),
    seuilAlerte: z
      .number()
      .positive()
      .default(200)
      .describe("Consommation en m³ au-delà de laquelle un signalement est émis"),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ ancienIndex, nouvelIndex, seuilAlerte }) => {
    const consommation = nouvelIndex - ancienIndex;
    const anomalies: string[] = [];

    if (nouvelIndex < ancienIndex) {
      anomalies.push(
        "INDEX_REGRESSIF: le nouvel index est inférieur à l'ancien (compteur remplacé ou erreur de saisie).",
      );
    }
    if (consommation === 0) {
      anomalies.push("CONSOMMATION_NULLE: aucune consommation détectée sur la période.");
    }
    if (consommation > seuilAlerte) {
      anomalies.push(
        `CONSOMMATION_ELEVEE: ${consommation} m³ dépasse le seuil d'alerte de ${seuilAlerte} m³ (fuite possible).`,
      );
    }

    const result = {
      ancienIndex,
      nouvelIndex,
      consommation,
      seuilAlerte,
      valide: anomalies.length === 0,
      anomalies,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
