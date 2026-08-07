# Tables métier SOMEI liées au relevé

Référence des tables Oracle utilisées par le cycle de relevé (chargement / relevé / déchargement).

## RLR — Releveurs et terminaux
| Colonne | Rôle |
|---|---|
| `COD_RLR` | Code releveur (ex. `MENH`) — sert de `NomUtilisateur` (AuthentificationBeanIn) |
| `NOM_RLR` | Nom complet (ex. MENASRA HICHEM) |
| `NUM_TP_RLR` | Numéro du terminal portable (ex. `611`) — `NumeroTerminalPortable` des appels SOAP |
| `PSW_RLR` | Mot de passe releveur (ex. `MENH`) — `MotDePasse` |
| `IND_ETA_TP_RLR` | `D` = déchargé (prêt à charger) · `C` = chargé (tournée en cours) |
| `NUM_TRN_CHG_RLR` | Tournée actuellement chargée sur le terminal |

> Blocage classique : le serveur refuse un nouveau chargement tant que `IND_ETA_TP_RLR = 'C'`.
> Il faut décharger la tournée précédente (`DechargementReleves` + `ValideDechargement`) pour repasser à `D`.

## TRN — Tournées principales
`NUM_TRN`, `ANN_TRN`, `PER_TRN` (clé), `IND_CHT_TRN` (`O`/`N` = déjà chargée),
`COD_ETA_TRN` (`AT` à traiter, `RL` réalisée), compteurs `NBR_*`.

## TRN_SEC — Tournées secondaires (secteurs)
Découpage d'une tournée en regroupements : clé `NUM_TRN + ANN_TRN + PER_TRN + NUM_RGR_SEC`
(ex. secteur `611`), avec les compteurs de points par secteur.

## RLR_TRN — Affectation releveur ↔ tournée
`NUM_TRN_RLR_TRN`, `COD_RLR_RLR_TRN`, `IND_VAL_RLR_TRN` (`O` validée / `N` en attente),
`NBJ_AFT_RLR_TRN`, `NBJ_TVL_RLR_TRN`.

## RLR_TRN_SEC — Affectation détaillée releveur ↔ secteur
`NUM_TRN_RLR_SEC`, `IND_TYP_AFT_RLR_SEC`, `COD_RLR_RLR_SEC`, `NUM_RGR_RLR_SEC`,
`NUM_ORD_PRG_RLR_SEC` (ordre de passage), `IND_VAL_CHG_RLR_SEC`.

## Workflow
1. **Planification** : création de `TRN` puis découpage en `TRN_SEC`.
2. **Affectation** : `RLR_TRN` (tournée) puis `RLR_TRN_SEC` (secteurs + ordre).
3. **Chargement PDA** : `TourneeEnCours(NUM_TP_RLR)` → `ListeReleves` → `ValideChargement`.
   Nécessite `IND_ETA_TP_RLR = 'D'`; le serveur bascule ensuite le terminal en `C`.
4. **Relevé terrain** : index stockés localement (`CSO_RLV`).
5. **Déchargement** : `DechargementReleves` → mise à jour serveur → terminal remis à `D`.

## Configuration dans l'app
Profil > Configuration SOMEI :
- **Client ID / Access Key** : accès web-service (`WSAcces.GenerateToken`).
- **Login / Mot de passe releveur** : `COD_RLR` / `PSW_RLR` (ex. `MENH` / `MENH`).
- **Numéro terminal portable** : `NUM_TP_RLR` (ex. `611`).

Variables d'environnement équivalentes : `VITE_SOAP_USERNAME`, `VITE_SOAP_PASSWORD`,
`VITE_SOAP_NUM_TERMINAL`.
