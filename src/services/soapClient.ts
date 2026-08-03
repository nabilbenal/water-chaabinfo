/**
 * Client SOAP pour les web-services SOMEI
 * Gère la construction d'enveloppes XML, l'authentification (GenerateToken),
 * et la transformation des données entre objets internes et XML.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

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

/**
 * Enveloppe SOAP. Les services SOMEI (ASMX) répondent en SOAP 1.1 :
 * namespace http://schemas.xmlsoap.org/soap/envelope/ + Content-Type text/xml + SOAPAction.
 * Le mode 1.2 reste disponible en repli.
 */
function buildSoapEnvelope(body: string, version: 11 | 12 = 11): string {
  const ns = version === 11
    ? 'http://schemas.xmlsoap.org/soap/envelope/'
    : 'http://www.w3.org/2003/05/soap-envelope';
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="${ns}"
               xmlns:web="${NAMESPACE}">
  <soap:Header/>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

/** Extrait le message d'une SOAP Fault (1.1 faultstring / 1.2 Reason>Text) */
function extractSoapFault(xml: string): string | null {
  return (
    extractTagValue(xml, 'faultstring') ||
    extractTagValue(xml, 'soap:Text') ||
    extractTagValue(xml, 'Text') ||
    null
  );
}


function extractTagValue(xml: string, tag: string): string | null {
  // Tolère un préfixe de namespace quelconque (<a:Token>, <ns2:Token>, …)
  const bare = tag.includes(':') ? tag.split(':').pop()! : tag;
  const regex = new RegExp(`<(?:[A-Za-z0-9_.-]+:)?${bare}[^>]*>([^<]*)</(?:[A-Za-z0-9_.-]+:)?${bare}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllTags(xml: string, tag: string): string[] {
  const bare = tag.includes(':') ? tag.split(':').pop()! : tag;
  const regex = new RegExp(`<(?:[A-Za-z0-9_.-]+:)?${bare}[^>]*>([^<]*)</(?:[A-Za-z0-9_.-]+:)?${bare}>`, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}


// ─── Debug SOAP ─────────────────────────────────────────────────
const DEBUG_KEY = 'soap-debug';
const MAX_DEBUG_ENTRIES = 20;

export interface SoapDebugEntry {
  timestamp: string;
  endpoint: string;
  soapAction: string;
  version: 11 | 12;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  status?: number;
  responseBody?: string;
  error?: string;
  durationMs: number;
}

let debugLog: SoapDebugEntry[] = [];
const debugListeners = new Set<(log: SoapDebugEntry[]) => void>();

export function isSoapDebugEnabled(): boolean {
  return localStorage.getItem(DEBUG_KEY) === '1';
}

export function setSoapDebugEnabled(enabled: boolean): void {
  localStorage.setItem(DEBUG_KEY, enabled ? '1' : '0');
}

export function getSoapDebugLog(): SoapDebugEntry[] {
  return debugLog;
}

export function clearSoapDebugLog(): void {
  debugLog = [];
  debugListeners.forEach((l) => l(debugLog));
}

export function subscribeSoapDebug(listener: (log: SoapDebugEntry[]) => void): () => void {
  debugListeners.add(listener);
  return () => debugListeners.delete(listener);
}

/** Masque les secrets (AccessKey, Token) avant journalisation */
function redact(xml: string): string {
  return xml
    .replace(/(<(?:[\w.-]+:)?AccessKey[^>]*>)([^<]*)(<)/gi, '$1***$3')
    .replace(/(<(?:[\w.-]+:)?Token[^>]*>)([^<]{6})[^<]*(<)/gi, '$1$2…***$3');
}

function pushDebug(entry: SoapDebugEntry, failed: boolean): void {
  if (!isSoapDebugEnabled() && !failed) return;
  const safe: SoapDebugEntry = {
    ...entry,
    requestBody: redact(entry.requestBody),
    responseBody: entry.responseBody ? redact(entry.responseBody) : undefined,
  };
  debugLog = [safe, ...debugLog].slice(0, MAX_DEBUG_ENTRIES);
  debugListeners.forEach((l) => l(debugLog));
  if (isSoapDebugEnabled() || failed) {
    console.groupCollapsed(
      `[SOAP ${failed ? 'ÉCHEC' : 'OK'}] ${safe.soapAction} → ${safe.status ?? safe.error ?? '?'} (${safe.durationMs} ms)`
    );
    console.log('URL:', safe.url, '| SOAP', safe.version === 11 ? '1.1' : '1.2');
    console.log('Request headers:', safe.requestHeaders);
    console.log('Request body:\n' + safe.requestBody);
    if (safe.responseBody !== undefined) console.log('Response body:\n' + safe.responseBody);
    if (safe.error) console.log('Erreur:', safe.error);
    console.groupEnd();
  }
}

// ─── SOAP Request ───────────────────────────────────────────────
interface SoapResponse {
  status: 'OK' | 'WARNING' | 'ERROR';
  code: string;
  message: string;
  raw: string;
}


function buildEndpointUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

function nativeHeader(headers: Record<string, string>, name: string): string | null {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return entry?.[1] ?? null;
}

async function sendSoap(
  url: string,
  soapAction: string,
  body: string,
  version: 11 | 12,
  signal: AbortSignal,
  endpoint = ''
): Promise<{ status: number; xml: string }> {
  const envelope = buildSoapEnvelope(body, version);
  // SOAP 1.1 → text/xml + en-tête SOAPAction ; SOAP 1.2 → application/soap+xml (action dans le Content-Type)
  const headers: Record<string, string> =
    version === 11
      ? { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${soapAction}"` }
      : { 'Content-Type': `application/soap+xml; charset=utf-8; action="${soapAction}"` };

  const started = Date.now();
  const base = {
    timestamp: new Date().toISOString(),
    endpoint,
    soapAction,
    version,
    url,
    requestHeaders: headers,
    requestBody: envelope,
  };

  try {
    let result: { status: number; xml: string };
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        url,
        method: 'POST',
        headers,
        data: envelope,
        responseType: 'text',
        connectTimeout: 30000,
        readTimeout: 30000,
      });
      result = {
        status: response.status,
        xml: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      };
    } else {
      const response = await fetch(url, { method: 'POST', headers, body: envelope, signal });
      result = { status: response.status, xml: await response.text() };
    }

    const failed = result.status < 200 || result.status >= 300;
    pushDebug(
      { ...base, status: result.status, responseBody: result.xml, durationMs: Date.now() - started },
      failed
    );
    return result;
  } catch (error) {
    pushDebug(
      { ...base, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - started },
      true
    );
    throw error;
  }
}


async function soapRequest(
  endpoint: string,
  soapAction: string,
  body: string,
  config: SoapConfig
): Promise<SoapResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const url = buildEndpointUrl(config.serverUrl, endpoint);

    // Tentative SOAP 1.1 (format natif des services ASMX SOMEI), repli en 1.2
    let { status, xml } = await sendSoap(url, soapAction, body, 11, controller.signal, endpoint);
    if (status === 415 || status === 500) {
      try {
        const retry = await sendSoap(url, soapAction, body, 12, controller.signal, endpoint);

        if (retry.status >= 200 && retry.status < 300) {
          status = retry.status;
          xml = retry.xml;
        }
      } catch {
        /* on conserve l'erreur SOAP 1.1 */
      }
    }

    if (status < 200 || status >= 300) {
      const fault = extractSoapFault(xml);
      throw new Error(
        fault
          ? `Erreur SOAP ${status} : ${fault}`
          : `Erreur serveur SOAP: ${status} — ${xml.substring(0, 300)}`
      );
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

  // Le nom du champ varie selon les versions SOMEI (Token, Jeton, TokenId,
  // GenerateTokenResult…). On teste les variantes puis un repli générique.
  let token =
    extractTagValue(result.raw, 'Token') ||
    extractTagValue(result.raw, 'TokenId') ||
    extractTagValue(result.raw, 'TokenValue') ||
    extractTagValue(result.raw, 'Jeton') ||
    extractTagValue(result.raw, 'ConversationId') ||
    extractTagValue(result.raw, 'GenerateTokenResult');

  if (!token) {
    // Repli : dernier élément feuille non vide qui ressemble à un identifiant
    const leaves = [...result.raw.matchAll(/<(?:[A-Za-z0-9_.-]+:)?([A-Za-z0-9_]*[Tt]oken[A-Za-z0-9_]*)[^>]*>([^<]+)</g)];
    token = leaves.length ? leaves[leaves.length - 1][2].trim() : null;
  }

  if (!token) {
    throw new Error(
      `Aucun token reçu du serveur SOMEI. Réponse [${result.code}] ${result.message} — ${result.raw.substring(0, 400)}`
    );
  }

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

// ─── Test WSDL availability (HTTP GET) ──────────────────────────
export interface WsdlTestResult {
  success: boolean;
  url: string;
  status?: number;
  statusText?: string;
  contentType?: string | null;
  isWsdl?: boolean;
  durationMs: number;
  error?: string;
}

/**
 * Vérifie la disponibilité du WSDL en effectuant un GET simple.
 * Retourne le code HTTP, le content-type et indique si la réponse ressemble à du WSDL.
 */
export async function testWsdlAvailability(baseUrl?: string): Promise<WsdlTestResult> {
  const url = getWsdlUrl(baseUrl);
  const start = performance.now();
  if (!url) {
    return {
      success: false,
      url: '',
      durationMs: 0,
      error: 'Aucune URL WSDL configurée (VITE_SOAP_WSDL_URL ou VITE_SOAP_BASE_URL manquante).',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    let status: number;
    let statusText: string;
    let contentType: string | null;
    let text: string;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        responseType: 'text',
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      status = res.status;
      statusText = status >= 200 && status < 300 ? 'OK' : 'HTTP Error';
      contentType = nativeHeader(res.headers, 'content-type');
      text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } else {
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      status = res.status;
      statusText = res.statusText;
      contentType = res.headers.get('content-type');
      text = await res.text();
    }

    let isWsdl = false;
    try {
      isWsdl = /wsdl:definitions|<definitions[\s>]/i.test(text);
    } catch { /* ignore body read errors */ }
    return {
      success: status >= 200 && status < 300 && isWsdl,
      url,
      status,
      statusText,
      contentType,
      isWsdl,
      durationMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return {
      success: false,
      url,
      durationMs: Math.round(performance.now() - start),
      error: isAbort
        ? 'Délai dépassé (10s) — serveur injoignable ou bloqué (CORS / Mixed Content ?).'
        : error instanceof Error ? error.message : 'Erreur réseau inconnue',
    };
  } finally {
    clearTimeout(timeoutId);
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
  ORDRE: number | string;
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
    VAL_IDX_CSO_RLV?: number;
    COD_ANO_RLV?: string;
    COD_ANN_RLV?: string;
    /** Format Oracle attendu: dd/MM/yyyy HH:mm:ss */
    DAT_RLV_CSO_RLV?: string;
    COD_ORI_IDX?: string;
    CMT_RLR?: string;
    /** Photo encodée en base64 (sans préfixe data:) */
    PHOTO?: string;
  };
}

/** Formate une date ISO/Date vers le format Oracle attendu par SOMEI. */
export function toOracleDate(input?: string | Date): string {
  const d = input ? new Date(input) : new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function buildRelevePdaXml(r: RelevePdaOut): string {
  const ns = 'Somei.Webservice.EntiteMetier.Releve';
  let csoXml = `<ConsommationReleve xsi:nil="true" xmlns="${ns}" />`;
  if (r.ConsommationReleve) {
    const c = r.ConsommationReleve;
    csoXml = `<ConsommationReleve xmlns="${ns}">
      <VAL_IDX_CSO_RLV xmlns="${ns}">${c.VAL_IDX_CSO_RLV ?? ''}</VAL_IDX_CSO_RLV>
      <COD_ANO_RLV xmlns="${ns}">${escapeXml(c.COD_ANO_RLV ?? '')}</COD_ANO_RLV>
      <COD_ANN_RLV xmlns="${ns}">${escapeXml(c.COD_ANN_RLV ?? '')}</COD_ANN_RLV>
      <DAT_RLV_CSO_RLV xmlns="${ns}">${escapeXml(c.DAT_RLV_CSO_RLV || toOracleDate())}</DAT_RLV_CSO_RLV>
      <COD_ORI_IDX xmlns="${ns}">${escapeXml(c.COD_ORI_IDX ?? '')}</COD_ORI_IDX>
      <CMT_RLR xmlns="${ns}">${escapeXml(c.CMT_RLR ?? '')}</CMT_RLR>
      <PHOTO xmlns="${ns}">${c.PHOTO ?? ''}</PHOTO>
    </ConsommationReleve>`;
  }

  return `<RelevePdaInfo>
    <ORDRE xmlns="${ns}">${escapeXml(String(r.ORDRE ?? ''))}</ORDRE>
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
 * Parse la réponse ListeReleves en LoadedData.
 *
 * Les noms de balises suivent le schéma réel SOMEI (RelevePdaInfo + ConsommationReleve),
 * identiques à ceux consommés par le client Android Kotlin de référence :
 * NUM_PNT_DRT_ABO, NUM_CTA_ABO, RAI_SOC_CLI_ABO, NOM_RUE_LIV_ABO, NO_RUE_LIV_ABO, …
 */
export function parseListeRelevesResponse(xml: string): import('@/types/water').LoadedData {
  const abonnes: import('@/types/water').Abonne[] = [];
  const consommations: import('@/types/water').Consommation[] = [];
  const pointsDroit: import('@/types/water').PointDroit[] = [];
  const compteurs: import('@/types/water').Compteur[] = [];
  const elementsCompteur: import('@/types/water').ElementCompteur[] = [];

  // Extract all RelevePdaInfo blocks (tolère un préfixe de namespace)
  const blockRegex = /<(?:\w+:)?RelevePdaInfo(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?RelevePdaInfo>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(xml)) !== null) {
    const block = blockMatch[1];
    const tag = (...names: string[]) => {
      for (const name of names) {
        const r = new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i');
        const m = block.match(r);
        if (m && m[1].trim()) return decodeXml(m[1].trim());
      }
      return '';
    };
    const num = (...names: string[]) => {
      const v = tag(...names).replace(',', '.');
      const n = Number(v);
      return v !== '' && Number.isFinite(n) ? n : undefined;
    };

    const numPntDrt = tag('NUM_PNT_DRT_ABO', 'NUM_PNT_DRT', 'numPntDrt');
    if (!numPntDrt) continue;

    const ordre = num('ANC_NUM_ORD_REL_PNT_DRT', 'NUM_ORD_REL_ABO', 'ORDRE') ?? 0;

    abonnes.push({
      NUM_TRN_ABO: tag('NUM_TRN_ABO', 'NUM_TRN'),
      NUM_SEC_LIV_ABO: tag('NUM_SEC_LIV_ABO'),
      NUM_RUE_TRN_ABO: tag('NUM_RUE_TRN_ABO'),
      NUM_TRC_RUE_TRN_ABO: num('NUM_TRC_RUE_TRN_ABO') ?? 0,
      NO_RUE_LIV_ABO: num('NO_RUE_LIV_ABO') ?? 0,
      NO_ETG_LIV_ABO: num('NO_ETG_LIV_ABO') ?? 0,
      NUM_SEC_RGR_ABO: tag('NUM_SEC_RGR_ABO'),
      NOM_RUE_LIV_ABO: tag('NOM_RUE_LIV_ABO'),
      CPM_NO_RUE_LIV_ABO: tag('CPM_NO_RUE_LIV_ABO') || undefined,
      COD_TTR_RUE_LIV_ABO: tag('COD_TTR_RUE_LIV_ABO') || undefined,
      NUM_CTA_ABO: tag('NUM_CTA_ABO'),
      RAI_SOC_CLI_ABO: tag('RAI_SOC_CLI_ABO'),
      COD_TTR_CLI_ABO: tag('COD_TTR_CLI_ABO') || undefined,
      NUM_PHY_APT_ABO: tag('NUM_PHY_APT_ABO'),
      VAL_IDX_CSO_ANC_ABO: num('VAL_IDX_CSO_RLV', 'VAL_IDX_CSO', 'VAL_IDX_CSO_ANC_ABO') ?? 0,
      VOL_CSO_MAX_ABO: num('VOL_CSO_MAX_ABO'),
      VOL_CSO_MIN_ABO: num('VOL_CSO_MIN_ABO'),
      DIA_APT_ABO: num('DIA_APT_ABO'),
      ANN_FAB_CPR_ABO: num('ANN_FAB_CPR_ABO'),
      RPG_APT_PNT_DRT_ABO: tag('RPG_APT_PNT_DRT') || undefined,
      IND_ACB_APT_ABO: tag('IND_ACB_APT_PNT_DRT', 'IND_ACB_APT_ABO') || undefined,
      NUM_PNT_DRT_ABO: numPntDrt,
      COD_ETA_CTA_ABO: tag('COD_ETA_CTA_ABO') || undefined,
      NUM_ORD_REL_ABO: ordre,
      ORDRE: num('ORDRE') ?? ordre,
      NOM_COM: tag('NomCommune') || undefined,
      NUM_COM: num('NumeroCommune'),
      NUM_PHY_APT_RGR: tag('NumeroPhysiqueRegroupant') || undefined,
      NUM_APT: tag('NUM_APT') || undefined,
      COD_TYP_RES: tag('COD_TYP_RES') || undefined,
      ID_ED: num('ID_ED'),
    });

    pointsDroit.push({
      NUM_PNT_DRT: numPntDrt,
      COD_PRT_1_PNT_DRT: tag('COD_PRT_1_PNT_DRT') || undefined,
      ANC_NUM_ORD_REL_PNT_DRT: tag('ANC_NUM_ORD_REL_PNT_DRT') || undefined,
    });

    const numApt = tag('NUM_APT');
    if (numApt) {
      compteurs.push({ NUM_APT: numApt, COD_MDL_APT_APT: tag('COD_MDL_APT_APT') || undefined });
      const numSerie = tag('NUM_SER_ELT_APT');
      if (numSerie) {
        elementsCompteur.push({
          COD_ELT_APT: tag('COD_ELT_APT'),
          COD_MDL_ELT_APT: tag('COD_MDL_ELT_APT') || undefined,
          NUM_APT: numApt,
          NUM_SER_ELT_APT: numSerie,
        });
      }
    }

    // Historique de consommation (ConsommationReleve + éventuels blocs Consommations)
    const datRlv = tag('DAT_RLV_CSO_RLV', 'DAT_RLV_ABT_CSO');
    const valIdx = num('VAL_IDX_CSO_RLV', 'VAL_IDX_CSO');
    if (datRlv || valIdx !== undefined) {
      consommations.push({
        NUM_PNT_DRT_CSO: numPntDrt,
        ANN_HIS_CSO: tag('ANN_HIS_CSO', 'ANN_HIS_RLV'),
        PER_HIS_CSO: num('PER_HIS_CSO', 'PER_HIS_RLV') ?? 0,
        DAT_RLV_ABT_CSO: datRlv,
        COD_ANN_RLV_CSO: tag('COD_ANN_RLV_CSO', 'COD_ANN_RLV') || undefined,
        COD_ANO_RLV_CSO: tag('COD_ANO_RLV_CSO', 'COD_ANO_RLV') || undefined,
        NBJ_DIF_PRE_CSO: num('NBJ_DIF_PRE_CSO'),
        VAL_IDX_CSO: valIdx,
        VOL_CSO_EAU_CSO: num('VOL_CSO_EAU_CSO'),
      });
    }
  }

  // Extract tournee info
  const tourneeNum =
    extractTagValue(xml, 'NumeroTournee') || extractTagValue(xml, 'NUM_TRN_ABO') || extractTagValue(xml, 'NUM_TRN') || '';
  const annee = parseInt(extractTagValue(xml, 'ANN_TRN') || '', 10);
  const periode = parseInt(extractTagValue(xml, 'PER_TRN') || '', 10);
  const tournees: import('@/types/water').Tournee[] = tourneeNum
    ? [{
        NUM_TRN: tourneeNum,
        ANN_TRN: Number.isFinite(annee) ? annee : undefined,
        PER_TRN: Number.isFinite(periode) ? periode : undefined,
      }]
    : [];

  return {
    abonnes,
    tournees,
    compteurs,
    anomalies: [],
    annulations: [],
    accessibilites: [],
    modeles: [],
    portes: [],
    consommations,
    parametres: [],
    elementsCompteur,
    pointsDroit,
  };
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
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
