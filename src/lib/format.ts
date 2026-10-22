/** Formatadores de data/hora em pt-BR (fuso de Campo Grande, MS). */

const TZ = 'America/Campo_Grande';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  })
    .format(new Date(iso))
    .replace(/\./g, '');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}

/** Data por extenso: "22 de outubro de 2026". */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/* -------------------------------------------------------------------------- */
/* Semana da farmacia de plantao                                              */
/* -------------------------------------------------------------------------- */

export interface WeekDay {
  /** Data no formato ISO (YYYY-MM-DD). */
  iso: string;
  /** Rotulo curto: "seg 20/10". */
  label: string;
  /** Rotulo por extenso: "Segunda-feira, 20 de outubro". */
  longLabel: string;
}

/** Os 7 dias (segunda a domingo) da semana que contem `reference`. */
export function getWeekDays(reference: Date = new Date()): WeekDay[] {
  const day = reference.getDay(); // 0 = domingo
  const offsetToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(reference);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() + offsetToMonday);

  const days: WeekDay[] = [];

  for (let index = 0; index < 7; index += 1) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);

    days.push({
      iso: current.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        timeZone: TZ,
      })
        .format(current)
        .replace('.', ''),
      longLabel: new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        timeZone: TZ,
      }).format(current),
    });
  }

  return days;
}
