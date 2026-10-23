import { useState } from 'react';

/**
 * ActionButton.tsx
 * -----------------------------------------------------------------------------
 * Botao que dispara uma mutacao no painel e mostra o resultado na hora.
 *
 * Usado em: fila de revisao (aprovar/devolver), pistas do leitor, anuncios
 * locais e gestao de colunistas. Evita recarregar a pagina inteira.
 */

interface Props {
  /** URL completa da API (ex.: `/api/admin/articles/123`). */
  endpoint: string;
  /** Corpo JSON enviado no POST. */
  payload?: Record<string, unknown>;
  /** Metodo HTTP. `DELETE` nao envia corpo (usado para excluir anuncios/colunistas). */
  method?: 'POST' | 'DELETE';
  label: string;
  /** Texto curto exibido no mobile (o `label` vira o titulo accessible). */
  shortLabel?: string;
  icon?: 'check' | 'x' | 'trash' | 'send' | 'eye' | 'pen';
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  /** Pede confirmacao antes de enviar. */
  confirm?: string;
  /** Recarrega a pagina apos a acao (ex.: quando o item sai da lista). */
  reload?: boolean;
  /** Callbackapos a acao (ex.: atualizar a lista no pai). */
  onDone?: (result: Record<string, unknown>) => void;
}

const ICONS: Record<string, string> = {
  check:
    '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
};

const VARIANTS: Record<string, string> = {
  primary: 'bg-nioaque-green text-white hover:bg-nioaque-green-dark',
  success: 'bg-nioaque-green text-white hover:bg-nioaque-green-dark',
  ghost: 'border border-line bg-nioaque-white text-ink hover:bg-editorial',
  danger: 'bg-nioaque-red text-white hover:bg-nioaque-red-dark',
};

export default function ActionButton({
  endpoint,
  payload = {},
  method = 'POST',
  label,
  shortLabel,
  icon,
  variant = 'primary',
  confirm,
  reload = false,
  onDone,
}: Props) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function run() {
    if (confirm && !window.confirm(confirm)) return;

    setState('busy');
    setMessage('');

    try {
      const response = await fetch(endpoint, {
        method,
        ...(method === 'POST'
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
          : {}),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setState('error');
        setMessage(String(data.error ?? 'Nao foi possivel concluir a acao.'));
        return;
      }

      setState('done');
      setMessage('Pronto!');
      onDone?.(data);
      if (reload) {
        window.location.reload();
        return;
      }
    } catch {
      setState('error');
      setMessage('Falha de conexao. Tente novamente.');
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={state === 'busy'}
        title={label}
        className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-60 ${VARIANTS[variant]}`}
      >
        {icon && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: ICONS[icon] ?? '' }}
          />
        )}
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </button>

      {message && (
        <span
          className={`text-[11px] font-semibold ${
            state === 'error' ? 'text-nioaque-red' : 'text-nioaque-green'
          }`}
          role="status"
        >
          {message}
        </span>
      )}
    </span>
  );
}
