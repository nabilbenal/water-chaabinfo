import { defineMcp } from "@lovable.dev/mcp-js";
import listReferenceCodes from "./tools/list-anomaly-codes";
import validateMeterReading from "./tools/validate-meter-reading";

export default defineMcp({
  name: "seaco-releve-eau-mcp",
  title: "SEACO — Relève d'Eau MCP",
  version: "0.1.0",
  instructions:
    "Outils utilitaires publics pour l'application SEACO — Relève d'Eau. " +
    "Permet aux assistants IA de consulter les codes d'anomalie/annulation et " +
    "de valider un relevé de compteur (calcul de consommation, détection " +
    "d'anomalies). Aucune donnée d'abonné n'est exposée.",
  tools: [listReferenceCodes, validateMeterReading],
});
