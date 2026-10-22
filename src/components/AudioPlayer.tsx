import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * AudioPlayer.tsx
 * -----------------------------------------------------------------------------
 * "Ouvir a Notícia" — lê o título, o resumo e o texto da matéria em voz alta
 * usando a Web Speech API (pt-BR), sem depender de nenhum arquivo de áudio.
 *
 * Recursos: tocar/pausar/Parar, velocidade (1x / 1.5x) e barra de progresso
 * conforme a leitura avanca (evento `boundary`).
 */
interface AudioPlayerProps {
  /** Titulo da materia. */
  title: string;
  /** Topicos do "Direto ao Ponto". */
  bullets?: string[];
  /** Texto do corpo (HTML). */
  html: string;
}

type PlayerState = 'idle' | 'playing' | 'paused' | 'ended';

const SPEEDS = [1, 1.5];

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AudioPlayer({ title, bullets = [], html }: AudioPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle');
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [supported, setSupported] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);

  const chunks = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* Monta os blocos lidos em voz alta (titulo, resumo e corpo). */
  useEffect(() => {
    const body = stripHtml(html);
    const resumo = bullets.filter((bullet) => bullet.trim()).join('. ');

    chunks.current = [
      `Matéria do O Nioaquense. ${title}.`,
      resumo ? `Direto ao ponto. ${resumo}.` : '',
      body,
    ].filter((chunk) => chunk.trim().length > 0);
  }, [title, bullets, html]);

  /* Libera a Web Speech API ao sair da pagina. */
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = useCallback(
    (index: number) => {
      const synth = window.speechSynthesis;
      if (!chunks.current[index]) {
        setState('ended');
        setProgress(100);
        return;
      }

      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(chunks.current[index]!);
      utterance.lang = 'pt-BR';
      utterance.rate = speed;
      utterance.pitch = 1;

      const voices = synth.getVoices();
      const ptVoice =
        voices.find((voice) => voice.lang === 'pt-BR') ??
        voices.find((voice) => voice.lang?.startsWith('pt'));
      if (ptVoice) utterance.voice = ptVoice;

      utterance.onboundary = (event) => {
        if (event.name === 'word' || event.name === 'sentence') {
          const length = chunks.current[index]?.length ?? 1;
          const local = Math.min(100, (event.charIndex / length) * 100);
          setChunkIndex(index);
          setProgress((index * 100 + local) / chunks.current.length);
        }
      };

      utterance.onend = () => {
        if (index + 1 < chunks.current.length) {
          speakFrom(index + 1);
        } else {
          setState('ended');
          setProgress(100);
        }
      };

      utterance.onerror = (event) => {
        setPlayerError((event as SpeechSynthesisErrorEvent).error ?? 'desconhecido');
        setState('idle');
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
      setState('playing');
    },
    [speed],
  );

  function toggle() {
    const synth = window.speechSynthesis;

    if (state === 'playing') {
      synth.pause();
      setState('paused');
      return;
    }

    if (state === 'paused') {
      synth.resume();
      setState('playing');
      return;
    }

    setProgress(0);
    speakFrom(0);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setState('idle');
    setProgress(0);
  }

  function changeSpeed(next: number) {
    setSpeed(next);

    if (state === 'playing') {
      // reinicia a partir do bloco atual com a nova velocidade
      window.speechSynthesis.cancel();
      speakFrom(chunkIndex);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-line bg-nioaque-white p-4 text-sm text-ink-soft">
        Seu navegador não oferece leitura em voz alta. O texto da matéria continua disponível logo
        abaixo.
      </div>
    );
  }

  const label = state === 'playing' ? 'Pausar' : state === 'paused' ? 'Continuar' : 'Ouvir a Notícia';

  return (
    <section
      className="rounded-2xl border border-line bg-nioaque-white p-4 sm:p-5"
      aria-label="Ouvir a matéria"
      data-player-state={state}
      data-player-chunks={chunks.current.length}
      data-player-error={playerError ?? ''}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={state === 'playing'}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-nioaque-green px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-nioaque-green-dark sm:flex-none"
        >
          {state === 'playing' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          )}
          {label}
        </button>

        {state !== 'idle' && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:border-nioaque-red hover:text-nioaque-red"
          >
            Parar
          </button>
        )}

        <div
          className="flex items-center gap-1 rounded-full bg-editorial p-1"
          role="group"
          aria-label="Velocidade da leitura"
        >
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeSpeed(value)}
              aria-pressed={speed === value}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                speed === value
                  ? 'bg-nioaque-white text-nioaque-green shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      {/* Progresso */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-editorial">
        <div
          className="h-full rounded-full bg-nioaque-green transition-[width] duration-200"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da leitura"
        />
      </div>

      <p className="mt-2 text-[11px] text-ink-muted">
        Leitura em voz alta com a voz do seu aparelho, em português do Brasil.
      </p>
    </section>
  );
}
