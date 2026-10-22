import { useRef, useState } from 'react';

/**
 * EnviarPistaForm.tsx
 * -----------------------------------------------------------------------------
 * Formulario "Boca no Trombone" (Mande sua Notícia).
 *
 * Mobile-first: campos grandes, botão de enviar fixo no rodapé e fotos
 * comprimidas em WebP **no cliente**, antes de qualquer upload.
 */

interface Photo {
  dataUrl: string;
  sizeKb: number;
  name: string;
}

const MAX_PHOTOS = 5;

async function compressToWebp(file: File): Promise<{ dataUrl: string; sizeKb: number }> {
  const originalKb = Math.round(file.size / 1024);

  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 1400;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas indisponivel');

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.8),
    );

    if (!blob) throw new Error('compressao falhou');

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return { dataUrl, sizeKb: Math.round(blob.size / 1024) };
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return { dataUrl, sizeKb: originalKb };
  }
}

export default function EnviarPistaForm() {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    'w-full rounded-xl border border-line bg-editorial px-4 py-3.5 text-base text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none';

  async function handleFiles(list: FileList | null) {
    if (!list) return;

    const remaining = MAX_PHOTOS - photos.length;
    const selected = [...list].slice(0, remaining);

    for (const file of selected) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const compressed = await compressToWebp(file);
        setPhotos((current) => [...current, { ...compressed, name: file.name }]);
      } catch {
        setError('Não foi possível processar uma das fotos.');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/leitores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: name,
          sender_whatsapp: whatsapp,
          neighborhood,
          message,
          photos: photos.map((photo) => photo.dataUrl),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível enviar agora. Tente pelo WhatsApp.');
        return;
      }

      setDone(true);
    } catch {
      setError('Falha de conexão. Tente novamente ou mande pelo WhatsApp.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-nioaque-green-100 bg-nioaque-green-50 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-nioaque-green text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="mt-4 font-editorial text-xl font-semibold text-nioaque-green-dark">
          Recebemos a sua dica!
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          A redação vai apurar o que você contou. Se virar notícia, avisamos pelo WhatsApp.
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setName('');
            setWhatsapp('');
            setNeighborhood('');
            setMessage('');
            setPhotos([]);
          }}
          className="mt-5 rounded-full border border-nioaque-green px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-nioaque-green transition-colors hover:bg-nioaque-green hover:text-white"
        >
          Enviar outra
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Seu nome <span className="font-normal normal-case tracking-normal">(opcional)</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Como podemos te chamar"
          className={`${inputClass} mt-1.5`}
        />
      </label>

      <label className="block">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          WhatsApp
        </span>
        <input
          type="tel"
          inputMode="tel"
          required
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          placeholder="(67) 9 9999-9999"
          className={`${inputClass} mt-1.5`}
        />
        <span className="mt-1.5 block text-[11px] text-ink-muted">
          É por aqui que a redação te responde.
        </span>
      </label>

      <label className="block">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Bairro ou região
        </span>
        <input
          type="text"
          value={neighborhood}
          onChange={(event) => setNeighborhood(event.target.value)}
          placeholder="Ex.: Vila Nova, Centro, Assentamento..."
          className={`${inputClass} mt-1.5`}
        />
      </label>

      <label className="block">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          O que aconteceu?
        </span>
        <textarea
          required
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Conta o que você viu, ouviu ou sabe. Quanto mais detalhe, mais rápido a gente apura."
          className={`${inputClass} mt-1.5 resize-y leading-relaxed`}
        />
      </label>

      {/* Fotos */}
      <div>
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Fotos <span className="font-normal normal-case tracking-normal">(até {MAX_PHOTOS})</span>
        </span>

        {photos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <li key={photo.name + index} className="relative">
                <img
                  src={photo.dataUrl}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-line"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                  aria-label={`Remover ${photo.name}`}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white shadow"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-editorial px-4 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Anexar fotos
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <p className="mt-1.5 text-[11px] text-ink-muted">
          As fotos são comprimidas no seu celular antes de serem enviadas.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-nioaque-red-50 px-4 py-3 text-sm font-semibold text-nioaque-red-dark"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nioaque-red px-6 py-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-red-dark disabled:opacity-60"
      >
        {busy ? 'Enviando...' : 'Mandar para a redação'}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-ink-muted">
        Ao enviar, você concorda que a redação apure a informação e publique. Não usamos seu nome sem
        autorização.
      </p>
    </form>
  );
}
