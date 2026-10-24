import { useState } from 'react';

/**
 * ToggleSwitch.tsx
 * -----------------------------------------------------------------------------
 * Interruptor que grava uma chave booleana no painel.
 *
 * Uso principal: "Pode publicar direto sem revisao" na Gestao de Colunistas.
 * A permissao e' sempre reavaliada no servidor (nao confia no client).
 */

interface Props {
  /** URL completa da API. */
  endpoint: string;
  /** Campo booleano enviado no corpo. */
  field: string;
  /** Estado inicial. */
  checked: boolean;
  label: string;
  description?: string;
  /** Caracteristica especial para o interruptor (ex.: a chave de publicacao). */
  highlight?: 'green' | 'red';
  onDone?: (result: Record<string, unknown>) => void;
}

export default function ToggleSwitch({
  endpoint,
  field,
  checked: initialChecked,
  label,
  description,
  highlight = 'green',
  onDone,
}: Props) {
  const [checked, setChecked] = useState(initialChecked);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const onColor = highlight === 'red' ? 'bg-nioaque-red' : 'bg-nioaque-green';

  async function toggle() {
    const next = !checked;
    setBusy(true);
    setMessage('');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        setMessage(String(data.error ?? 'Nao foi possivel salvar.'));
        return;
      }

      setChecked(next);
      setMessage(next ? 'Ativado' : 'Desativado');
      onDone?.(data);
    } catch {
      setMessage('Falha de conexao. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>}
        {message && (
          <p
            className="mt-1 text-[11px] font-semibold text-nioaque-green"
            role="status"
          >
            {message}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={busy}
        onClick={toggle}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nioaque-green/40 focus-visible:ring-offset-2 disabled:opacity-60 ${
          checked ? onColor : 'bg-line-strong'
        }`}
      >
        {/* `left-0` explícito: sem ele o knob herda o `text-align:center` do
            <button> e nasce centralizado, deixando o estado "desligado" torto. */}
        <span
          className={`absolute left-0 top-1 h-5 w-5 rounded-sm bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
