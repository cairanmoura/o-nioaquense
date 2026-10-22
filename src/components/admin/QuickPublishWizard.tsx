import { useMemo, useRef, useState } from 'react';

/**
 * QuickPublishWizard.tsx
 * -----------------------------------------------------------------------------
 * Editor Rapido de Publicacao em 3 passos (mobile-first).
 *
 *   Passo 1 - Capa (com compressao para WebP no cliente), titulo, subtitulo,
 *             editoria e a marca de "Urgente"
 *   Passo 2 - Os 3 topicos do "Direto ao Ponto" + editor de texto limpo
 *   Passo 3 - Revisao, publicacao (respeitando a trava `can_publish_directly`)
 *             e o "Kit WhatsApp" pronto para copiar e colar nos grupos
 *
 * Nada e' confiado ao client: o status final e' decidido pelo servidor
 * (ver `resolveStatus` em `src/lib/admin.ts`).
 */

type Step = 1 | 2 | 3;

interface ArticleSeed {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  summary_bullets: string[];
  content: string;
  cover_image_url: string | null;
  cover_image_caption: string | null;
  scope: string;
  category_label: string | null;
  is_breaking: boolean;
  status: string;
}

interface Props {
  mode: 'create' | 'edit';
  article?: ArticleSeed;
  role: 'admin' | 'columnist';
  canPublishDirectly: boolean;
  categories: string[];
  scopes: { value: string; label: string }[];
  /** URL publica do portal (usada no link do Kit WhatsApp). */
  siteUrl: string;
}

interface Cover {
  dataUrl: string;
  fileName: string;
  sizeKb: number;
}

const EMPTY = {
  title: '',
  subtitle: '',
  slug: '',
  bullets: ['', '', ''],
  content: '',
  category: '',
  scope: 'nioaque',
  isBreaking: false,
  caption: '',
};

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

/**
 * Compressao para WebP no cliente (antes de qualquer upload).
 * Reduz para no maximo 1600px de largura com qualidade 0.82.
 */
async function compressToWebp(file: File): Promise<{ dataUrl: string; sizeKb: number }> {
  const originalKb = Math.round(file.size / 1024);

  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas indisponivel');

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.82),
    );

    if (!blob) throw new Error('compressao falhou');

    return {
      dataUrl: await blobToDataUrl(blob),
      sizeKb: Math.round(blob.size / 1024),
    };
  } catch {
    // Fallback: envia o arquivo original
    return { dataUrl: await readFileAsDataUrl(file), sizeKb: originalKb };
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      // Fallback para navegadores sem Clipboard API (ou sem contexto seguro)
      const legacy = (
        document as unknown as {
          execCommand?: (command: string) => boolean;
        }
      ).execCommand;

      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = legacy?.call(document, 'copy') ?? false;
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Componente                                                                 */
/* -------------------------------------------------------------------------- */

export default function QuickPublishWizard({
  mode,
  article,
  role,
  canPublishDirectly,
  categories,
  scopes,
  siteUrl,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(() => ({
    title: article?.title ?? EMPTY.title,
    subtitle: article?.subtitle ?? EMPTY.subtitle,
    slug: article?.slug ?? EMPTY.slug,
    bullets: article?.summary_bullets ?? [...EMPTY.bullets],
    content: article?.content ?? EMPTY.content,
    category: article?.category_label ?? EMPTY.category,
    scope: article?.scope ?? EMPTY.scope,
    isBreaking: article?.is_breaking ?? EMPTY.isBreaking,
    caption: article?.cover_image_caption ?? EMPTY.caption,
  }));

  const [cover, setCover] = useState<Cover | null>(null);
  const [existingCover, setExistingCover] = useState<string | null>(
    article?.cover_image_url ?? null,
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    slug: string;
    status: string;
    coerced: boolean;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canPublish = role === 'admin' || canPublishDirectly;

  const coverPreview = cover?.dataUrl ?? existingCover;

  /**
   * O slug definitivo e' o que o SERVIDOR gravou (ele gera um unico quando o
   * campo vem vazio). Depois de publicar, o link do Kit WhatsApp tem que usar
   * esse slug - senao o link enviado ao grupo nao abre a materia.
   */
  const effectiveSlug = result?.slug || form.slug;

  const whatsappText = useMemo(() => {
    const bullets = form.bullets.filter((bullet) => bullet.trim());
    const url = effectiveSlug
      ? `${siteUrl}/materia/${effectiveSlug}`
      : `${siteUrl}/materia/nova-materia`;

    return [
      `*${form.title || 'Titulo da materia'}*`,
      '',
      ...bullets.map((bullet) => `• ${bullet.trim()}`),
      '',
      `Leia no O Nioaquense: ${url}`,
    ].join('\n');
  }, [form.title, form.bullets, effectiveSlug, siteUrl]);

  /* ------------------------------ imagens ------------------------------ */

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setCompressing(true);
    setError('');

    try {
      const compressed = await compressToWebp(file);
      setCover({ ...compressed, fileName: file.name });
    } catch {
      setError('Nao foi possivel processar a imagem.');
    } finally {
      setCompressing(false);
    }
  }

  /* --------------------------- editor de texto -------------------------- */

  function wrapSelection(before: string, after: string, placeholder: string) {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || placeholder;

    const next = `${form.content.slice(0, start)}${before}${selected}${after}${form.content.slice(end)}`;
    setForm((previous) => ({ ...previous, content: next }));

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function insertList() {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || 'Primeiro item';

    const items = selected
      .split('\n')
      .map((line) => `  <li>${line.trim()}</li>`)
      .join('\n');

    const block = `<ul>\n${items}\n</ul>`;
    const next = `${form.content.slice(0, start)}${block}${form.content.slice(end)}`;
    setForm((previous) => ({ ...previous, content: next }));

    requestAnimationFrame(() => textarea.focus());
  }

  function insertLink() {
    const textarea = contentRef.current;
    if (!textarea) return;

    const url = window.prompt('Endereco do link (https://...)');
    if (!url) return;

    wrapSelection(`<a href="${url}">`, '</a>', 'texto do link');
  }

  /* ------------------------------- submit ------------------------------- */

  async function publish(target: 'published' | 'pending_review' | 'draft') {
    setBusy(true);
    setError('');

    try {
      let coverUrl = existingCover;

      if (cover) {
        const upload = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: cover.dataUrl, filename: cover.fileName }),
        });

        const uploadData = (await upload.json()) as { url?: string; error?: string };

        if (!upload.ok || !uploadData.url) {
          throw new Error(uploadData.error ?? 'Falha no envio da imagem.');
        }

        coverUrl = uploadData.url;
      }

      const response = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article?.id,
          title: form.title,
          subtitle: form.subtitle,
          slug: form.slug,
          summary_bullets: form.bullets,
          content: form.content,
          cover_image_url: coverUrl,
          cover_image_caption: form.caption,
          scope: form.scope,
          category_label: form.category,
          is_breaking: form.isBreaking,
          status: target,
        }),
      });

      const data = (await response.json()) as {
        article?: { slug: string; status: string };
        coerced?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.article) {
        throw new Error(data.error ?? 'Nao foi possivel salvar a materia.');
      }

      setResult({
        slug: data.article.slug,
        status: data.article.status,
        coerced: Boolean(data.coerced),
        message: data.message,
      });

      // O servidor pode ter gerado um slug: sincroniza com o que foi gravado
      setForm((previous) => ({ ...previous, slug: data.article!.slug }));

      setStep(3);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Falha inesperada ao salvar.',
      );
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------- render ------------------------------- */

  if (result) {
    const published = result.status === 'published';

    return (
      <div className="space-y-5">
        <div
          className={`rounded-2xl p-5 ${
            published ? 'bg-nioaque-green-50' : 'bg-amber-100'
          }`}
        >
          <p
            className={`font-editorial text-xl font-semibold ${
              published ? 'text-nioaque-green-dark' : 'text-amber-900'
            }`}
          >
            {published ? 'Materia publicada!' : 'Enviada para a revisao'}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {published
              ? 'O texto ja esta no ar. Abaixo esta o pacote pronto para os grupos de WhatsApp.'
              : 'O Editor-Chefe vai revisar o texto e publicar. Voce ja pode compartilhar o resumo abaixo.'}
          </p>
        </div>

        {/* Kit WhatsApp */}
        <section className="overflow-hidden rounded-2xl border border-line bg-nioaque-white">
          <header className="flex items-center gap-2 border-b border-line bg-nioaque-green px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2 22l5.36-1.4a9.83 9.83 0 0 0 4.68 1.2h.01c5.43 0 9.84-4.4 9.84-9.84C21.89 6.4 17.48 2 12.04 2Zm5.76 14.02c-.24.68-1.4 1.3-1.94 1.36-.54.06-1.04.08-1.68-.12-.4-.12-.9-.3-1.56-.58-2.74-1.18-4.52-3.94-4.66-4.12-.14-.18-1.12-1.5-1.12-2.86 0-1.36.7-2.02.96-2.3.26-.28.56-.34.74-.34.18 0 .38 0 .54.02.18.02.42-.06.66.5.24.56.82 1.94.9 2.08.06.14.1.3.02.48-.08.18-.12.3-.24.46-.12.16-.26.36-.36.48-.12.12-.26.26-.1.5.14.24.64 1.06 1.38 1.72.94.84 1.74 1.1 1.98 1.22.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.18 1.2Z" />
              </svg>
            </span>
            <div>
              <h2 className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-white">
                Kit WhatsApp
              </h2>
              <p className="text-[11px] text-white/75">Copie e cole no grupo</p>
            </div>
          </header>

          <div className="p-4">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-editorial p-4 font-sans text-[0.9375rem] leading-relaxed text-ink">
              {whatsappText}
            </pre>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyText(whatsappText);
                  setCopied(ok);
                  if (ok) setTimeout(() => setCopied(false), 2500);
                }}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${
                  copied
                    ? 'bg-nioaque-green text-white'
                    : 'bg-[#25D366] text-white hover:opacity-90'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {copied ? (
                    <path d="M20 6 9 17l-5-5" />
                  ) : (
                    <>
                      <rect x="9" y="9" width="12" height="12" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </>
                  )}
                </svg>
                {copied ? 'Copiado!' : 'Copiar para grupos de WhatsApp'}
              </button>

              <a
                href={`/materia/${result.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-ink transition-colors hover:bg-editorial"
              >
                Ver a materia
              </a>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setStep(1);
          }}
          className="w-full rounded-full border border-line px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:bg-editorial"
        >
          Escrever outra materia
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-0">
      {/* Indicador de passos */}
      <ol className="mb-6 flex items-center gap-2" aria-label="Etapas da publicacao">
        {[1, 2, 3].map((number) => {
          const state = number < step ? 'done' : number === step ? 'current' : 'todo';
          return (
            <li key={number} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => number < step && setStep(number as Step)}
                disabled={number > step}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  state === 'todo'
                    ? 'bg-line text-ink-muted'
                    : state === 'done'
                      ? 'bg-nioaque-green text-white'
                      : 'bg-nioaque-red text-white'
                }`}
              >
                {state === 'done' ? '✓' : number}
              </button>
              <span
                className={`hidden text-[11px] font-bold uppercase tracking-[0.1em] sm:block ${
                  state === 'current' ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {number === 1 ? 'Capa e titulo' : number === 2 ? 'Resumo e texto' : 'Publicar'}
              </span>
              {number < 3 && <span className="h-px flex-1 bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-nioaque-red-50 px-4 py-3 text-sm font-semibold text-nioaque-red-dark"
        >
          {error}
        </p>
      )}

      {/* ------------------------------ PASSO 1 ----------------------------- */}
      {step === 1 && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
            <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-nioaque-green">
              Imagem de capa
            </h2>

            <div className="mt-3">
              {coverPreview ? (
                <div className="overflow-hidden rounded-xl border border-line">
                  <img
                    src={coverPreview}
                    alt="Previa da capa"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 bg-editorial px-3 py-2">
                    <span className="text-[11px] font-semibold text-ink-muted">
                      {cover
                        ? `${cover.fileName} · ${cover.sizeKb} KB (WebP)`
                        : 'Capa atual'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCover(null);
                        setExistingCover(null);
                      }}
                      className="text-[11px] font-bold uppercase tracking-[0.1em] text-nioaque-red"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-editorial text-ink-muted transition-colors hover:border-nioaque-green hover:text-nioaque-green"
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-4.6-4.6a2 2 0 0 0-2.8 0L3 21" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-[0.1em]">
                    {compressing ? 'Comprimindo...' : 'Escolher imagem'}
                  </span>
                  <span className="text-[11px] opacity-70">
                    Comprimida para WebP antes de subir
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>

            <label className="mt-4 block">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Legenda da foto
              </span>
              <input
                type="text"
                value={form.caption}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, caption: event.target.value }))
                }
                placeholder="Ex.: Trecho central da MS-178 durante a pintura das faixas"
                className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
              />
            </label>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
            <label className="block">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Titulo *
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, title: event.target.value }))
                }
                placeholder="O que aconteceu?"
                className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 font-editorial text-lg font-semibold text-ink placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Subtitulo
              </span>
              <input
                type="text"
                value={form.subtitle}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, subtitle: event.target.value }))
                }
                placeholder="Uma linha que explica o titulo"
                className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Editoria
                </span>
                <select
                  value={form.scope}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, scope: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink focus:border-nioaque-green focus:outline-none"
                >
                  {scopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Categoria
                </span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink focus:border-nioaque-green focus:outline-none"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl bg-editorial px-4 py-3">
              <input
                type="checkbox"
                checked={form.isBreaking}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, isBreaking: event.target.checked }))
                }
                className="h-5 w-5 shrink-0 accent-nioaque-red"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Marcar como Urgente</span>
                <span className="block text-[11px] text-ink-muted">
                  Entra na faixa de "Ultima hora" da capa
                </span>
              </span>
            </label>
          </section>
        </div>
      )}

      {/* ------------------------------ PASSO 2 ----------------------------- */}
      {step === 2 && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
            <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-nioaque-green">
              Direto ao Ponto
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Os 3 pontos que o leitor precisa saber antes de abrir a materia.
            </p>

            <div className="mt-3 space-y-3">
              {form.bullets.map((bullet, index) => (
                <label key={index} className="flex items-start gap-3">
                  <span className="mt-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-nioaque-red text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={(event) => {
                      const next = [...form.bullets];
                      next[index] = event.target.value;
                      setForm((previous) => ({ ...previous, bullets: next }));
                    }}
                    placeholder={`Topico ${index + 1}`}
                    className="w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-nioaque-green">
                Texto da materia
              </h2>
              <button
                type="button"
                onClick={() => setPreview((value) => !value)}
                className="rounded-full border border-line px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft"
              >
                {preview ? 'Editar' : 'Previa'}
              </button>
            </div>

            {preview ? (
              <div
                className="prose-editorial mt-3 min-h-[220px] rounded-xl border border-line bg-editorial p-4 font-editorial text-[1.0625rem] leading-[1.75] text-ink"
                dangerouslySetInnerHTML={{ __html: form.content || '<p>A previa aparece aqui.</p>' }}
              />
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => wrapSelection('<strong>', '</strong>', 'negrito')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-editorial text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green"
                    aria-label="Negrito"
                    title="Negrito"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 4h7a4 4 0 0 1 0 8H6z" />
                      <path d="M6 12h8a4 4 0 0 1 0 8H6z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection('<em>', '</em>', 'italico')}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-editorial text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green"
                    aria-label="Italico"
                    title="Italico"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 4h-9" />
                      <path d="M14 20H5" />
                      <path d="M15 4 9 20" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection('<h2>', '</h2>', 'Subtitulo')}
                    className="flex h-9 items-center justify-center rounded-lg border border-line bg-editorial px-2.5 text-[11px] font-bold uppercase text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={insertList}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-editorial text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green"
                    aria-label="Lista"
                    title="Lista"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M8 6h13M8 12h13M8 18h13" />
                      <path d="M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={insertLink}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-editorial text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green"
                    aria-label="Link"
                    title="Link"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                    </svg>
                  </button>
                </div>

                <textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, content: event.target.value }))
                  }
                  rows={12}
                  placeholder="Escreva a materia. Os parrafos sao separados por uma linha em branco."
                  className="mt-3 w-full resize-y rounded-xl border border-line bg-editorial p-4 font-editorial text-[1.0625rem] leading-[1.75] text-ink placeholder:font-sans placeholder:text-base placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
                />
              </>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------ PASSO 3 ----------------------------- */}
      {step === 3 && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-nioaquense-white p-4 sm:p-5">
            <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-nioaque-green">
              Revisao final
            </h2>

            {coverPreview && (
              <img
                src={coverPreview}
                alt="Capa"
                className="mt-3 aspect-[16/9] w-full rounded-xl object-cover"
              />
            )}

            <h3 className="mt-4 font-editorial text-xl font-semibold leading-snug text-ink">
              {form.title || 'Sem titulo'}
            </h3>
            {form.subtitle && <p className="mt-1 text-sm text-ink-soft">{form.subtitle}</p>}

            {form.bullets.filter((bullet) => bullet.trim()).length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-4">
                {form.bullets
                  .filter((bullet) => bullet.trim())
                  .map((bullet, index) => (
                    <li key={index} className="flex gap-3 text-sm text-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-nioaque-red" />
                      {bullet}
                    </li>
                  ))}
              </ul>
            )}

            <label className="mt-4 block border-t border-line pt-4">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                Endereco da materia (slug)
              </span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-editorial px-4 py-3">
                <span className="shrink-0 text-xs text-ink-muted">/materia/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, slug: event.target.value }))
                  }
                  placeholder="gerado-automaticamente"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none"
                />
              </div>
            </label>
          </section>

          {/* Trava de publicacao */}
          <section
            className={`rounded-2xl border p-4 sm:p-5 ${
              canPublish
                ? 'border-nioaque-green-100 bg-nioaque-green-50'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  canPublish ? 'bg-nioaque-green text-white' : 'bg-amber-500 text-white'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {canPublish ? (
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                  ) : (
                    <>
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </>
                  )}
                </svg>
              </span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    canPublish ? 'text-nioaque-green-dark' : 'text-amber-900'
                  }`}
                >
                  {canPublish
                    ? 'Voce pode publicar direto'
                    : 'Sua coluna nao publica direto (sem revisao)'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {canPublish
                    ? 'Ao publicar, a materia entra no ar imediatamente e voce recebe o Kit WhatsApp.'
                    : 'O texto vai para a fila do Editor-Chefe. Voce recebe o Kit WhatsApp para compartilhar assim que for aprovado.'}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            {canPublish ? (
              <button
                type="button"
                onClick={() => void publish('published')}
                disabled={busy || !form.title.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-nioaque-green px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-green-dark disabled:opacity-60"
              >
                {busy ? 'Publicando...' : 'Publicar agora'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void publish('pending_review')}
                disabled={busy || !form.title.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-nioaque-red px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-red-dark disabled:opacity-60"
              >
                {busy ? 'Enviando...' : 'Enviar para revisao'}
              </button>
            )}

            <button
              type="button"
              onClick={() => void publish('draft')}
              disabled={busy || !form.title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-soft transition-colors hover:bg-editorial disabled:opacity-60"
            >
              Salvar rascunho
            </button>
          </div>

          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full rounded-full border border-line px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:bg-editorial"
            >
              Voltar para o inicio
            </button>
          )}
        </div>
      )}

      {/* Barra de acao fixa (mobile) */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-nioaque-white/97 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((step - 1) as Step)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft"
              aria-label="Passo anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as Step)}
              disabled={step === 1 && !form.title.trim()}
              className="h-12 flex-1 rounded-full bg-nioaque-green text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-green-dark disabled:opacity-50"
            >
              Continuar
            </button>
          ) : (
            <a
              href="/admin"
              className="flex h-12 flex-1 items-center justify-center rounded-full border border-line text-xs font-bold uppercase tracking-[0.12em] text-ink-soft"
            >
              Voltar ao painel
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
