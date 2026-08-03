import React, { useEffect, useState } from 'react';
import { Bug, Copy, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  getSoapDebugLog,
  clearSoapDebugLog,
  subscribeSoapDebug,
  isSoapDebugEnabled,
  setSoapDebugEnabled,
  type SoapDebugEntry,
} from '@/services/soapClient';

function formatEntry(e: SoapDebugEntry): string {
  return [
    `── ${e.timestamp} — ${e.soapAction} (SOAP ${e.version === 11 ? '1.1' : '1.2'}) — ${e.durationMs} ms`,
    `POST ${e.url}`,
    `Request headers: ${JSON.stringify(e.requestHeaders, null, 2)}`,
    `Request body:\n${e.requestBody}`,
    e.status !== undefined ? `Response status: ${e.status}` : '',
    e.responseBody ? `Response body:\n${e.responseBody}` : '',
    e.error ? `Erreur: ${e.error}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export default function SoapDebugPanel() {
  const [enabled, setEnabled] = useState(isSoapDebugEnabled());
  const [log, setLog] = useState<SoapDebugEntry[]>(getSoapDebugLog());
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => subscribeSoapDebug(setLog), []);

  const toggle = () => {
    const next = !enabled;
    setSoapDebugEnabled(next);
    setEnabled(next);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(log.map(formatEntry).join('\n\n'));
    toast.success('Journal SOAP copié');
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Bug className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Mode debug SOAP</span>
        <button
          onClick={toggle}
          role="switch"
          aria-checked={enabled}
          aria-label="Activer le mode debug SOAP"
          className={`ml-auto h-5 w-9 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-border'}`}
        >
          <span
            className={`block h-4 w-4 rounded-full bg-card shadow transition-transform ${
              enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Journalise la requête et la réponse brutes (URL, en-têtes, enveloppe XML). Les échecs
        d'authentification sont toujours enregistrés, même mode désactivé. Clé d'accès et token sont masqués.
      </p>

      {log.length > 0 && (
        <>
          <div className="flex gap-2">
            <button
              onClick={copyAll}
              className="flex-1 py-1.5 rounded-md border border-border bg-card text-[11px] flex items-center justify-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copier ({log.length})
            </button>
            <button
              onClick={clearSoapDebugLog}
              className="flex-1 py-1.5 rounded-md border border-border bg-card text-[11px] flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Vider
            </button>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {log.map((e, i) => {
              const failed = e.error !== undefined || (e.status ?? 0) < 200 || (e.status ?? 0) >= 300;
              const open = openIndex === i;
              return (
                <div key={`${e.timestamp}-${i}`} className="rounded-md border border-border bg-card">
                  <button
                    onClick={() => setOpenIndex(open ? null : i)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-left"
                  >
                    {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className={`font-mono ${failed ? 'text-destructive' : 'text-success'}`}>
                      {e.status ?? 'ERR'}
                    </span>
                    <span className="truncate">{e.soapAction.split('/').pop()}</span>
                    <span className="ml-auto opacity-60">{e.durationMs} ms</span>
                  </button>
                  {open && (
                    <pre className="px-2 pb-2 text-[10px] font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-64 overflow-y-auto">
                      {formatEntry(e)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
