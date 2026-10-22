import { useRef, useState } from 'react';

/**
 * ProfileEditor.tsx
 * -----------------------------------------------------------------------------
 * Edicao do proprio perfil: foto (com compressao WebP no cliente), nome,
 * nome da coluna e bio.
 *
 * O usuario NUNCA altera o proprio `role` nem a chave de publicacao direta —
 * isso e' barrado no servidor e no banco.
 */

interface Props {
  profile: {
    full_name: string;
    column_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    social_links: Record<string, string>;
  };
  role: 'admin' | 'columnist';
}

async function compressToWebp(file: File): Promise<{ dataUrl: string; sizeKb: number }> {
  const originalKb = Math.round(file.size / 1024);

  try {
    const bitmap = await createImageBitmap(file);
    const maxWidth = 600;
    const scale = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas indisponivel');

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85),
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

export default function ProfileEditor({ profile, role }: Props) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [columnName, setColumnName] = useState(profile.column_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatar, setAvatar] = useState<{ dataUrl: string; sizeKb: number } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setError('');
    setMessage('');

    try {
      const compressed = await compressToWebp(file);
      setAvatar(compressed);
    } catch {
      setError('Nao foi possivel processar a imagem.');
    }
  }

  async function save() {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      let finalAvatar = avatarUrl;

      if (avatar) {
        const upload = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: avatar.dataUrl, filename: 'avatar.webp' }),
        });

        const uploadData = (await upload.json()) as { url?: string; error?: string };

        if (!upload.ok || !uploadData.url) {
          throw new Error(uploadData.error ?? 'Falha no envio da foto.');
        }

        finalAvatar = uploadData.url;
      }

      const response = await fetch('/api/admin/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          column_name: columnName,
          bio,
          avatar_url: finalAvatar,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? 'Nao foi possivel salvar.');
      }

      setAvatarUrl(finalAvatar);
      setAvatar(null);
      setMessage('Perfil atualizado.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha inesperada.');
    } finally {
      setBusy(false);
    }
  }

  const preview = avatar?.dataUrl ?? avatarUrl;

  return (
    <div className="space-y-5">
      {/* Foto */}
      <section className="rounded-2xl border border-line bg-nioaque-white p-5">
        <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-nioaque-green">
          Foto
        </h2>

        <div className="mt-3 flex items-center gap-4">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full object-cover ring-[3px] ring-nioaque-green"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-ink/10 font-editorial text-2xl font-semibold text-ink-soft ring-[3px] ring-line">
              {fullName.charAt(0) || '?'}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full border border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-nioaque-green hover:text-nioaque-green"
            >
              {preview ? 'Trocar foto' : 'Enviar foto'}
            </button>
            <p className="mt-2 text-[11px] text-ink-muted">
              Quadrada, comprimida para WebP antes de subir.
            </p>
            {avatar && (
              <p className="mt-1 text-[11px] font-semibold text-nioaque-green">
                {avatar.sizeKb} KB pronta para envio
              </p>
            )}
          </div>
        </div>

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
      </section>

      {/* Dados */}
      <section className="space-y-4 rounded-2xl border border-line bg-nioaque-white p-5">
        <label className="block">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Nome de exibicao
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink focus:border-nioaque-green focus:outline-none"
          />
        </label>

        {role === 'columnist' && (
          <label className="block">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Nome da coluna
            </span>
            <input
              type="text"
              value={columnName}
              onChange={(event) => setColumnName(event.target.value)}
              placeholder="Ex.: Visao de Nioaque"
              className="mt-1.5 w-full rounded-xl border border-line bg-editorial px-4 py-3 text-sm text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
            />
            <span className="mt-1.5 block text-[11px] text-ink-muted">
              Aparece no cards de colunistas e na home.
            </span>
          </label>
        )}

        <label className="block">
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Bio
          </span>
          <textarea
            rows={4}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Quem e voce, o que escreve, ha quanto tempo."
            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-editorial px-4 py-3 text-sm leading-relaxed text-ink placeholder:text-ink-muted/60 focus:border-nioaque-green focus:outline-none"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-nioaque-red-50 px-4 py-3 text-sm font-semibold text-nioaque-red-dark">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="rounded-xl bg-nioaque-green-50 px-4 py-3 text-sm font-semibold text-nioaque-green-dark">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => void save()}
          disabled={busy || !fullName.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nioaque-green px-5 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-green-dark disabled:opacity-60"
        >
          {busy ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </section>
    </div>
  );
}
