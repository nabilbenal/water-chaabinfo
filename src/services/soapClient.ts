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

/** Sauvegarde la configuration SOAP dans localStorage */
export function saveSoapConfig(config: SoapConfig): void {
  cachedConfig = config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Récupère la configuration SOAP */
export function getSoapConfig(): SoapConfig | null {
  if (cachedConfig) return cachedConfig;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    cachedConfig = JSON.parse(raw);
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

// ─── Utility exports ────────────────────────────────────────────
export { escapeXml, buildSoapEnvelope, extractTagValue, extractAllTags };
