import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

type Status = 'idle' | 'loading' | 'sending' | 'sent' | 'demo' | 'error';

interface FormState {
  sender_name: string;
  sender_whatsapp: string;
  neighborhood: string;
  message: string;
}

const EMPTY_FORM: FormState = {
  sender_name: '',
  sender_whatsapp: '',
  neighborhood: '',
  message: '',
};

/**
 * Ilha React: formulario de envio de pistas para a redacao.
 *
 * - Com Supabase configurado: grava em `reader_submissions` (RLS permite
 *   insercao anonima com status 'pending').
 * - Sem Supabase (modo demonstracao): orienta o leitor a mandar pelo WhatsApp.
 */
export default function EnviarPista() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    let mounted = true;

    createSupabaseBrowserClient().then((client) => {
      if (mounted) {
        setSupabase(client);
        setStatus(client ? 'idle' : 'demo');
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="rounded-2xl border border-line bg-nioaque-white p-6 text-center text-sm text-ink-muted">
        Carregando configuracao...
      </div>
    );
  }

  function update(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.sender_name.trim() || !form.message.trim()) {
      setStatus('error');
      setMessage('Preencha seu nome e a mensagem.');
      return;
    }

    if (!supabase) {
      setStatus('demo');
      setMessage(
        'Modo demonstracao: o Supabase ainda nao esta conectado. A pista sera enviada direto pelo WhatsApp.',
      );
      return;
    }

    setStatus('sending');
    setMessage('');

    const { error } = await supabase.from('reader_submissions').insert({
      sender_name: form.sender_name.trim(),
      sender_whatsapp: form.sender_whatsapp.trim(),
      neighborhood: form.neighborhood.trim() || null,
      message: form.message.trim(),
      media_urls: [],
      status: 'pending',
    });

    if (error) {
      setStatus('error');
      setMessage('Nao foi possivel enviar agora. Tente novamente ou fale pelo WhatsApp.');
      return;
    }

    setStatus('sent');
    setMessage('Pista enviada! Nossa redacao vai checar e pode entrar em contato.');
    setForm(EMPTY_FORM);
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-nioaque-green-100 bg-nioaque-green-50 p-6 text-center">
        <p className="font-editorial text-lg font-semibold text-nioaque-green-dark">
          Obrigado pela pista!
        </p>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <button
          type="button"
          onClick={() => {
            setStatus('idle');
            setMessage('');
          }}
          className="mt-4 rounded-full border border-nioaque-green px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-nioaque-green transition-colors hover:bg-nioaque-green hover:text-white"
        >
          Enviar outra
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Seu nome
          </span>
          <input
            type="text"
            value={form.sender_name}
            onChange={(event) => update('sender_name', event.target.value)}
            placeholder="Como podemos te chamar?"
            className="mt-1.5 w-full rounded-xl border border-line bg-nioaque-white px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-nioaque-green focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            WhatsApp
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={form.sender_whatsapp}
            onChange={(event) => update('sender_whatsapp', event.target.value)}
            placeholder="(67) 9 9999-9999"
            className="mt-1.5 w-full rounded-xl border border-line bg-nioaque-white px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-nioaque-green focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Bairro
        </span>
        <input
          type="text"
          value={form.neighborhood}
          onChange={(event) => update('neighborhood', event.target.value)}
          placeholder="Ex.: Vila Nova"
          className="mt-1.5 w-full rounded-xl border border-line bg-nioaque-white px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-nioaque-green focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          O que aconteceu?
        </span>
        <textarea
          rows={4}
          value={form.message}
          onChange={(event) => update('message', event.target.value)}
          placeholder="Conte o que voce viu, ouviu ou sabe."
          className="mt-1.5 w-full resize-y rounded-xl border border-line bg-nioaque-white px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-muted/70 focus:border-nioaque-green focus:outline-none"
        />
      </label>

      {message && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            status === 'error'
              ? 'bg-nioaque-red-50 text-nioaque-red-dark'
              : 'bg-nioaque-green-50 text-nioaque-green-dark'
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="inline-flex items-center justify-center rounded-full bg-nioaque-green px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-green-dark disabled:opacity-60"
        >
          {status === 'sending' ? 'Enviando...' : 'Enviar pista'}
        </button>

        <a
          href="https://wa.me/5567999990000?text=Tenho%20uma%20pista%20para%20o%20O%20Nioaquense"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-nioaque-green px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-nioaque-green transition-colors hover:bg-nioaque-green-50"
        >
          Enviar pelo WhatsApp
        </a>
      </div>
    </form>
  );
}
