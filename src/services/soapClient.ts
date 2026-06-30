/**
 * Client SOAP pour les web-services SOMEI
 * Gère la construction d'enveloppes XML, l'authentification (GenerateToken),
 * et la transformation des données entre objets internes et XML.
 */

// ─── Configuration ──────────────────────────────────────────────
export interface SoapConfig {
  /** URL de base du serveur SOMEI (ex: http://10.53.64.61/rec) */
  serverUrl: string;
  /** Identifiant client fourni par la SOMEI */
  clientId: string;
  /** Clé d'accès (mot de passe) */
  accessKey: string;
}

const STORAGE_KEY = 'soap-config';
const TOKEN_KEY = 'soap-token';

let cachedConfig: SoapConfig | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Valeurs par défaut injectées au build via les variables d'environnement Vite.
 * - VITE_SOAP_BASE_URL : URL de base du serveur SOMEI (ex: https://somei.seaco.local/rec)
 * - VITE_SOAP_WSDL_URL : URL explicite du WSDL (optionnel, sinon déduite de BASE_URL)
 * - VITE_SOAP_CLIENT_ID / VITE_SOAP_ACCESS_KEY : identifiants par défaut (optionnels)
 *
 * Ces valeurs servent UNIQUEMENT de défauts : l'utilisateur peut toujours les
 * surcharger depuis l'écran Profil > Configuration SOMEI (stockés en localStorage).
 */
export const SOAP_ENV_DEFAULTS = {
  baseUrl: (import.meta.env.VITE_SOAP_BASE_URL as string | undefined)?.replace(/\/+$/, '') || '',
  wsdlUrl: (import.meta.env.VITE_SOAP_WSDL_URL as string | undefined) || '',
  clientId: (import.meta.env.VITE_SOAP_CLIENT_ID as string | undefined) || '',
  accessKey: (import.meta.env.VITE_SOAP_ACCESS_KEY as string | undefined) || '',
} as const;

/** Retourne l'URL du WSDL (par défaut WSAcces.asmx?wsdl sur la base) */
export function getWsdlUrl(baseUrl?: string): string {
  if (SOAP_ENV_DEFAULTS.wsdlUrl) return SOAP_ENV_DEFAULTS.wsdlUrl;
  const base = (baseUrl || getSoapConfig()?.serverUrl || SOAP_ENV_DEFAULTS.baseUrl || '').replace(/\/+$/, '');
  return base ? `${base}/WSAcces.asmx?wsdl` : '';
}

/** Sauvegarde la configuration SOAP dans localStorage */
export function saveSoapConfig(config: SoapConfig): void {
  cachedConfig = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Récupère la configuration SOAP (priorité : localStorage > variables d'environnement) */
export function getSoapConfig(): SoapConfig | null {
  if (cachedConfig) return cachedConfig;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    cachedConfig = JSON.parse(raw);
    return cachedConfig;
  }
  // Repli sur les variables d'environnement si présentes
  if (SOAP_ENV_DEFAULTS.baseUrl) {
    cachedConfig = {
      serverUrl: SOAP_ENV_DEFAULTS.baseUrl,
      clientId: SOAP_ENV_DEFAULTS.clientId,
      accessKey: SOAP_ENV_DEFAULTS.accessKey,
    };
    return cachedConfig;
  }
  return null;
}

/** Efface la configuration et le token */
export function clearSoapConfig(): void {
  cachedConfig = null;
  cachedToken = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

// ─── XML Helpers ────────────────────────────────────────────────
const NAMESPACE = 'http://www.somei.fr/webservices/';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/2003/05/soap-envelope"
               xmlns:web="${NAMESPACE}">
  <soap:Header/>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

function extractTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllTags(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

// ─── SOAP Request ───────────────────────────────────────────────
interface SoapResponse {
  status: 'OK' | 'WARNING' | 'ERROR';
  code: string;
  message: string;
  raw: string;
}

async function soapRequest(
  endpoint: string,
  soapAction: string,
  body: string,
  config: SoapConfig
): Promise<SoapResponse> {
  const envelope = buildSoapEnvelope(body);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${config.serverUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        SOAPAction: soapAction,
      },
      body: envelope,
      signal: controller.signal,
    });

    const xml = await response.text();

    if (!response.ok) {
      throw new Error(`Erreur serveur SOAP: ${response.status} — ${xml.substring(0, 200)}`);
    }

    const wsStatus = extractTagValue(xml, 'WSStatus') || 'ERROR';
    const wsCode = extractTagValue(xml, 'WSCode') || 'X0000';
    const wsMessage = extractTagValue(xml, 'WSMessage') || '';

    return {
      status: wsStatus as SoapResponse['status'],
      code: wsCode,
      message: wsMessage,
      raw: xml,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Délai de connexion SOAP dépassé (30s).');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── GenerateToken ──────────────────────────────────────────────
export async function generateToken(config?: SoapConfig): Promise<string> {
  const cfg = config || getSoapConfig();
  if (!cfg) throw new Error('Configuration SOAP non définie. Allez dans Profil > Paramètres serveur.');

  // Reuse cached token if still valid (5 min margin)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.value;
  }

  const body = `<web:GenerateToken>
      <web:accesBean>
        <web:ConversationId/>
        <web:ClientId>${escapeXml(cfg.clientId)}</web:ClientId>
        <web:AccessKey>${escapeXml(cfg.accessKey)}</web:AccessKey>
      </web:accesBean>
    </web:GenerateToken>`;

  const result = await soapRequest(
    'WSAcces.asmx',
    `${NAMESPACE}GenerateToken`,
    body,
    cfg
  );

  if (result.status === 'ERROR') {
    throw new Error(`Authentification SOMEI échouée: [${result.code}] ${result.message}`);
  }

  const token = extractTagValue(result.raw, 'Token');
  if (!token) {
    throw new Error('Aucun token reçu du serveur SOMEI.');
  }

  // Cache token for 55 minutes (typical SOMEI token lifetime ~1h)
  cachedToken = { value: token, expiresAt: Date.now() + 55 * 60 * 1000 };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(cachedToken));

  return token;
}

/** Récupère un token valide (du cache ou en le régénérant) */
export async function getValidToken(): Promise<string> {
  // Try from memory
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.value;
  }
  // Try from localStorage
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.expiresAt > Date.now() + 5 * 60 * 1000) {
        cachedToken = parsed;
        return parsed.value;
      }
    } catch { /* invalid stored token */ }
  }
  // Generate new
  return generateToken();
}

// ─── SOAP request with automatic token ──────────────────────────
export async function authenticatedSoapRequest(
  endpoint: string,
  soapAction: string,
  bodyBuilder: (token: string) => string
): Promise<SoapResponse> {
  const cfg = getSoapConfig();
  if (!cfg) throw new Error('Configuration SOAP non définie.');

  const token = await getValidToken();
  const body = bodyBuilder(token);
  const result = await soapRequest(endpoint, soapAction, body, cfg);

  // If token expired, retry once with fresh token
  if (result.status === 'ERROR' && (result.code === 'A0001' || result.code === 'A0002')) {
    cachedToken = null;
    localStorage.removeItem(TOKEN_KEY);
    const newToken = await generateToken();
    const retryBody = bodyBuilder(newToken);
    return soapRequest(endpoint, soapAction, retryBody, cfg);
  }

  return result;
}

// ─── Test connection ────────────────────────────────────────────
export async function testSoapConnection(config: SoapConfig): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const token = await generateToken(config);
    return {
      success: true,
      message: `Connexion réussie. Token obtenu: ${token.substring(0, 8)}...`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

// ─── WSRelevePda: TourneeEnCours ────────────────────────────────
export async function soapTourneeEnCours(numTerminal: string): Promise<string> {
  const result = await authenticatedSoapRequest(
    'WSRelevePda.asmx',
    `${NAMESPACE}TourneeEnCours`,
    (token) => `<web:TourneeEnCours>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
        <web:NumeroTerminalPortable>${escapeXml(numTerminal)}</web:NumeroTerminalPortable>
      </web:beanIn>
    </web:TourneeEnCours>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`TourneeEnCours échouée: [${result.code}] ${result.message}`);
  }
  return result.raw;
}

// ─── WSRelevePda: ListeReleves (Chargement) ─────────────────────
export async function soapListeReleves(numTerminal: string, numTournee: string): Promise<string> {
  const result = await authenticatedSoapRequest(
    'WSRelevePda.asmx',
    `${NAMESPACE}ListeReleves`,
    (token) => `<web:ListeReleves>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
        <web:NumeroTerminalPortable>${escapeXml(numTerminal)}</web:NumeroTerminalPortable>
        <web:NumeroTournee>${escapeXml(numTournee)}</web:NumeroTournee>
      </web:beanIn>
    </web:ListeReleves>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`ListeReleves échouée: [${result.code}] ${result.message}`);
  }
  return result.raw;
}

// ─── WSRelevePda: ValideChargement ──────────────────────────────
export async function soapValideChargement(numTerminal: string): Promise<void> {
  const result = await authenticatedSoapRequest(
    'WSRelevePda.asmx',
    `${NAMESPACE}ValideChargement`,
    (token) => `<web:ValideChargement>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
        <web:NumeroTerminalPortable>${escapeXml(numTerminal)}</web:NumeroTerminalPortable>
      </web:beanIn>
    </web:ValideChargement>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`ValideChargement échouée: [${result.code}] ${result.message}`);
  }
}

// ─── WSRelevePda: DechargementReleves ───────────────────────────
export interface RelevePdaOut {
  ORDRE: number;
  COD_PRT_1_PNT_DRT: string;
  ANC_NUM_ORD_REL_PNT_DRT: string;
  COD_ELT_APT: string;
  COD_MDL_ELT_APT: string;
  NUM_SER_ELT_APT: string;
  COD_MDL_APT_APT: string;
  NumeroCommune: number;
  NomCommune: string;
  NumeroPhysiqueRegroupant: string;
  ConsommationReleve?: {
    PER_HIS_RLV: number;
    ANN_HIS_RLV: number;
    NUM_PNT_DRT: string;
    COD_ANO_RLV?: string;
    COD_ANN_RLV?: string;
    DAT_RLV_CSO_RLV?: string;
    VAL_IDX_CSO_RLV?: number;
    CMT_RLR?: string;
  };
}

function buildRelevePdaXml(r: RelevePdaOut): string {
  const ns = 'Somei.Webservice.EntiteMetier.Releve';
  let csoXml = `<ConsommationReleve xsi:nil="true" xmlns="${ns}" />`;
  if (r.ConsommationReleve) {
    const c = r.ConsommationReleve;
    csoXml = `<ConsommationReleve xmlns="${ns}">
      <PER_HIS_RLV>${c.PER_HIS_RLV}</PER_HIS_RLV>
      <ANN_HIS_RLV>${c.ANN_HIS_RLV}</ANN_HIS_RLV>
      <NUM_PNT_DRT>${escapeXml(c.NUM_PNT_DRT)}</NUM_PNT_DRT>
      ${c.COD_ANO_RLV ? `<COD_ANO_RLV>${escapeXml(c.COD_ANO_RLV)}</COD_ANO_RLV>` : ''}
      ${c.COD_ANN_RLV ? `<COD_ANN_RLV>${escapeXml(c.COD_ANN_RLV)}</COD_ANN_RLV>` : ''}
      ${c.DAT_RLV_CSO_RLV ? `<DAT_RLV_CSO_RLV>${escapeXml(c.DAT_RLV_CSO_RLV)}</DAT_RLV_CSO_RLV>` : ''}
      ${c.VAL_IDX_CSO_RLV !== undefined ? `<VAL_IDX_CSO_RLV>${c.VAL_IDX_CSO_RLV}</VAL_IDX_CSO_RLV>` : ''}
      ${c.CMT_RLR ? `<CMT_RLR>${escapeXml(c.CMT_RLR)}</CMT_RLR>` : ''}
    </ConsommationReleve>`;
  }

  return `<RelevePdaInfo>
    <ORDRE xmlns="${ns}">${r.ORDRE}</ORDRE>
    <COD_PRT_1_PNT_DRT xmlns="${ns}">${escapeXml(r.COD_PRT_1_PNT_DRT)}</COD_PRT_1_PNT_DRT>
    <ANC_NUM_ORD_REL_PNT_DRT xmlns="${ns}">${escapeXml(r.ANC_NUM_ORD_REL_PNT_DRT)}</ANC_NUM_ORD_REL_PNT_DRT>
    <COD_ELT_APT xmlns="${ns}">${escapeXml(r.COD_ELT_APT)}</COD_ELT_APT>
    <COD_MDL_ELT_APT xmlns="${ns}">${escapeXml(r.COD_MDL_ELT_APT)}</COD_MDL_ELT_APT>
    <NUM_SER_ELT_APT xmlns="${ns}">${escapeXml(r.NUM_SER_ELT_APT)}</NUM_SER_ELT_APT>
    <COD_MDL_APT_APT xmlns="${ns}">${escapeXml(r.COD_MDL_APT_APT)}</COD_MDL_APT_APT>
    <Consommations xsi:nil="true" xmlns="${ns}" />
    ${csoXml}
    <RadioReleve xsi:nil="true" xmlns="${ns}" />
    <NumeroCommune xmlns="${ns}">${r.NumeroCommune}</NumeroCommune>
    <NomCommune xmlns="${ns}">${escapeXml(r.NomCommune)}</NomCommune>
    <NumeroPhysiqueRegroupant xmlns="${ns}">${escapeXml(r.NumeroPhysiqueRegroupant)}</NumeroPhysiqueRegroupant>
  </RelevePdaInfo>`;
}

export async function soapDechargementReleves(
  numTerminal: string,
  releves: RelevePdaOut[],
  dechargementSimple: boolean = false
): Promise<string> {
  const relevesXml = releves.map(buildRelevePdaXml).join('\n');

  const result = await authenticatedSoapRequest(
    'WSRelevePda.asmx',
    `${NAMESPACE}DechargementReleves`,
    (token) => `<web:DechargementReleves>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
        <web:NumeroTerminalPortable>${escapeXml(numTerminal)}</web:NumeroTerminalPortable>
        <web:Releves>
          ${relevesXml}
        </web:Releves>
        <web:DechargementSimple>${dechargementSimple}</web:DechargementSimple>
      </web:beanIn>
    </web:DechargementReleves>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`DechargementReleves échouée: [${result.code}] ${result.message}`);
  }
  return result.raw;
}

// ─── XML → LoadedData parser ────────────────────────────────────
/**
 * Parse the ListeReleves SOAP response XML into a LoadedData structure.
 * Extracts RelevePdaInfo elements and maps them to Abonne records.
 */
export function parseListeRelevesResponse(xml: string): import('@/types/water').LoadedData {
  const abonnes: import('@/types/water').Abonne[] = [];
  
  // Extract all RelevePdaInfo blocks
  const blockRegex = /<RelevePdaInfo>([\s\S]*?)<\/RelevePdaInfo>/gi;
  let blockMatch: RegExpExecArray | null;
  
  while ((blockMatch = blockRegex.exec(xml)) !== null) {
    const block = blockMatch[1];
    const tag = (name: string) => {
      const r = new RegExp(`<${name}[^>]*>([^<]*)</${name}>`, 'i');
      const m = block.match(r);
      return m ? m[1].trim() : '';
    };
    
    abonnes.push({
      NUM_TRN_ABO: tag('NUM_TRN') || '',
      NUM_SEC_LIV_ABO: tag('COD_PAL_SEC_GEO') || '',
      NUM_RUE_TRN_ABO: tag('NO_RUE') || '',
      NUM_TRC_RUE_TRN_ABO: parseInt(tag('NUM_RUE')) || 0,
      NO_RUE_LIV_ABO: parseInt(tag('NO_RUE')) || 0,
      NO_ETG_LIV_ABO: parseInt(tag('NO_ETG')) || 0,
      NUM_SEC_RGR_ABO: tag('NumeroPhysiqueRegroupant') || '',
      NOM_RUE_LIV_ABO: tag('LIB_RUE') || tag('NOM_RUE') || '',
      NUM_CTA_ABO: tag('NUM_CTA') || '',
      RAI_SOC_CLI_ABO: tag('NOM_CON') || tag('NOM_FAC') || '',
      NUM_PHY_APT_ABO: tag('NUM_APT') || tag('NO_APT') || '',
      VAL_IDX_CSO_ANC_ABO: parseInt(tag('VAL_IDX')) || 0,
      VOL_CSO_MAX_ABO: parseInt(tag('VAL_IDX_CSO_MAX')) || undefined,
      VOL_CSO_MIN_ABO: parseInt(tag('VAL_IDX_CSO_MIN')) || undefined,
      DIA_APT_ABO: parseInt(tag('DIA_APT')) || undefined,
      ANN_FAB_CPR_ABO: parseInt(tag('ANN_FAB')) || undefined,
      RPG_APT_PNT_DRT_ABO: tag('RPG_APT') || '',
      IND_ACB_APT_ABO: tag('COD_ACC_APT') || '',
      NUM_PNT_DRT_ABO: tag('NUM_PNT_DRT') || tag('COD_PRT_1_PNT_DRT') || '',
      COD_ETA_CTA_ABO: tag('ETA_CTA') || '',
      NUM_ORD_REL_ABO: parseInt(tag('ORDRE')) || parseInt(tag('NO_RLV')) || 0,
      ORDRE: parseInt(tag('ORDRE')) || 0,
      NOM_COM: tag('NomCommune') || tag('BUR_DSB_SEC_GEO') || '',
      NUM_COM: parseInt(tag('NumeroCommune')) || parseInt(tag('COD_COM')) || undefined,
      NUM_PHY_APT_RGR: tag('NumeroPhysiqueRegroupant') || '',
      NUM_APT: tag('NUM_APT') || tag('NO_APT') || '',
      COD_TYP_RES: tag('COD_TYP_MTR') || '',
      COD_PAL_PAL_ABO: tag('COD_PAL_SEC_GEO') || '',
    });
  }

  // Extract tournee info
  const tourneeNum = extractTagValue(xml, 'NUM_TRN') || extractTagValue(xml, 'NumeroTournee') || '';
  const tournees: import('@/types/water').Tournee[] = tourneeNum ? [{ NUM_TRN: tourneeNum }] : [];

  return {
    abonnes,
    tournees,
    compteurs: [],
    anomalies: [],
    annulations: [],
    accessibilites: [],
    modeles: [],
    portes: [],
    consommations: [],
    parametres: [],
    elementsCompteur: [],
    pointsDroit: [],
  };
}

// ─── WSParametragePda ───────────────────────────────────────────

export interface CelluleParam {
  code: string;
  libelle: string;
}

export interface FamilleIntervention {
  code: string;
  libelle: string;
}

export interface OrigineIntervention {
  code: string;
  libelle: string;
}

export interface TypeMoyen {
  code: string;
  libelle: string;
}

export interface ParametragePda {
  cellules: CelluleParam[];
  famillesIntervention: FamilleIntervention[];
  originesIntervention: OrigineIntervention[];
  typesMoyen: TypeMoyen[];
}

function parseCodeLibelleList(xml: string, blockTag: string): { code: string; libelle: string }[] {
  const results: { code: string; libelle: string }[] = [];
  const blockRegex = new RegExp(`<${blockTag}[^>]*>([\\s\\S]*?)</${blockTag}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(xml)) !== null) {
    const block = match[1];
    const code = extractTagValue(block, 'Code') || extractTagValue(block, 'COD') || '';
    const libelle = extractTagValue(block, 'Libelle') || extractTagValue(block, 'LIB') || '';
    if (code || libelle) {
      results.push({ code, libelle });
    }
  }
  // Fallback: try generic item tags if no results found
  if (results.length === 0) {
    const genericTags = ['CelluleInfo', 'FamilleInterventionInfo', 'OrigineInterventionInfo', 'TypeMoyenInfo', 'anyType'];
    for (const tag of genericTags) {
      const fallbackRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
      while ((match = fallbackRegex.exec(xml)) !== null) {
        const block = match[1];
        const code = extractTagValue(block, 'Code') || extractTagValue(block, 'COD') || '';
        const libelle = extractTagValue(block, 'Libelle') || extractTagValue(block, 'LIB') || '';
        if (code || libelle) {
          results.push({ code, libelle });
        }
      }
      if (results.length > 0) break;
    }
  }
  return results;
}

/** Récupère le paramétrage des cellules */
export async function soapRecupererCellules(): Promise<CelluleParam[]> {
  const result = await authenticatedSoapRequest(
    'WSParametragePda.asmx',
    `${NAMESPACE}RecupererParametrageCellules`,
    (token) => `<web:RecupererParametrageCellules>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
      </web:beanIn>
    </web:RecupererParametrageCellules>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`RecupererParametrageCellules échouée: [${result.code}] ${result.message}`);
  }
  return parseCodeLibelleList(result.raw, 'CelluleInfo');
}

/** Récupère le paramétrage des familles d'intervention */
export async function soapRecupererFamillesIntervention(): Promise<FamilleIntervention[]> {
  const result = await authenticatedSoapRequest(
    'WSParametragePda.asmx',
    `${NAMESPACE}RecupererParametrageFamillesIntervention`,
    (token) => `<web:RecupererParametrageFamillesIntervention>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
      </web:beanIn>
    </web:RecupererParametrageFamillesIntervention>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`RecupererParametrageFamillesIntervention échouée: [${result.code}] ${result.message}`);
  }
  return parseCodeLibelleList(result.raw, 'FamilleInterventionInfo');
}

/** Récupère le paramétrage des origines d'intervention */
export async function soapRecupererOriginesIntervention(): Promise<OrigineIntervention[]> {
  const result = await authenticatedSoapRequest(
    'WSParametragePda.asmx',
    `${NAMESPACE}RecupererParametrageOriginesIntervention`,
    (token) => `<web:RecupererParametrageOriginesIntervention>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
      </web:beanIn>
    </web:RecupererParametrageOriginesIntervention>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`RecupererParametrageOriginesIntervention échouée: [${result.code}] ${result.message}`);
  }
  return parseCodeLibelleList(result.raw, 'OrigineInterventionInfo');
}

/** Récupère le paramétrage des types de moyen */
export async function soapRecupererTypesMoyen(): Promise<TypeMoyen[]> {
  const result = await authenticatedSoapRequest(
    'WSParametragePda.asmx',
    `${NAMESPACE}RecupererParametrageTypesMoyen`,
    (token) => `<web:RecupererParametrageTypesMoyen>
      <web:beanIn>
        <web:ConversationId>${escapeXml(token)}</web:ConversationId>
      </web:beanIn>
    </web:RecupererParametrageTypesMoyen>`
  );
  if (result.status === 'ERROR') {
    throw new Error(`RecupererParametrageTypesMoyen échouée: [${result.code}] ${result.message}`);
  }
  return parseCodeLibelleList(result.raw, 'TypeMoyenInfo');
}

/** Charge tous les paramétrages PDA en parallèle */
export async function soapLoadAllParametrage(): Promise<ParametragePda> {
  const [cellules, famillesIntervention, originesIntervention, typesMoyen] = await Promise.all([
    soapRecupererCellules().catch(() => []),
    soapRecupererFamillesIntervention().catch(() => []),
    soapRecupererOriginesIntervention().catch(() => []),
    soapRecupererTypesMoyen().catch(() => []),
  ]);
  return { cellules, famillesIntervention, originesIntervention, typesMoyen };
}

// ─── Utility exports ────────────────────────────────────────────
export { escapeXml, buildSoapEnvelope, extractTagValue, extractAllTags };
