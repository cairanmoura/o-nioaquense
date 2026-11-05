/**
 * clima.ts
 * -----------------------------------------------------------------------------
 * Dados da pagina /clima: previsao por hora (48 h), previsao de 10 dias,
 * historico dos ultimos 30 dias e resumo mensal dos ultimos 12 meses.
 *
 * Fonte: Open-Meteo (gratuita, sem chave). A API do Google Weather guarda so
 * 24 h de historico, entao nao cobre o historico desta pagina; ela alimenta
 * apenas o "agora" (ver weather.ts). Cache de 30 min na borda.
 */

import { NIOAQUE_COORDS, describe } from './weather';
import type { WeatherIcon } from './weather';

const TZ = 'America/Campo_Grande';
const CACHE_TTL_SECONDS = 30 * 60;
const CACHE_URL = 'https://cache.o-nioaquense.internal/weather/clima-pagina-v1';
const TIMEOUT_MS = 6000;

export interface HoraClima {
  /** ISO local sem fuso: 2026-11-04T15:00 */
  time: string;
  hour: string;
  temp: number;
  rainProb: number;
  rainMm: number;
}

export interface DiaClima {
  date: string;
  weekday: string;
  day: string;
  tempMax: number;
  tempMin: number;
  rainProb: number;
  rainMm: number;
  uv: number;
  windMax: number;
  label: string;
  icon: WeatherIcon;
}

export interface DiaHistorico {
  date: string;
  day: string;
  tempMax: number;
  tempMin: number;
  rainMm: number;
}

export interface MesHistorico {
  label: string;
  rainMm: number;
  tempAvg: number;
}

export interface ClimaPagina {
  hours: HoraClima[];
  days: DiaClima[];
  history: DiaHistorico[];
  months: MesHistorico[];
  generatedAt: string;
  ok: boolean;
}

const EMPTY: ClimaPagina = { hours: [], days: [], history: [], months: [], generatedAt: '', ok: false };

/* -------------------------------------------------------------------------- */

function isoDate(d: Date): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

function shiftDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

const fmtWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const fmtDay = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: 'UTC' });
const fmtMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type Num = (number | null)[] | undefined;
const n = (arr: Num, i: number): number => arr?.[i] ?? 0;

/* -------------------------------------------------------------------------- */

async function buscarPrevisao(): Promise<Pick<ClimaPagina, 'hours' | 'days'>> {
  const { latitude, longitude } = NIOAQUE_COORDS;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&hourly=temperature_2m,precipitation_probability,precipitation' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,' +
    'precipitation_probability_max,uv_index_max,wind_speed_10m_max' +
    `&timezone=${encodeURIComponent(TZ)}&forecast_days=10&forecast_hours=48`;

  const data = await getJson<{
    hourly?: {
      time?: string[];
      temperature_2m?: Num;
      precipitation_probability?: Num;
      precipitation?: Num;
    };
    daily?: {
      time?: string[];
      weather_code?: Num;
      temperature_2m_max?: Num;
      temperature_2m_min?: Num;
      precipitation_sum?: Num;
      precipitation_probability_max?: Num;
      uv_index_max?: Num;
      wind_speed_10m_max?: Num;
    };
  }>(url);

  const h = data?.hourly;
  const d = data?.daily;

  const hours: HoraClima[] = (h?.time ?? []).map((time, i) => ({
    time,
    hour: time.slice(11, 13),
    temp: Math.round(n(h?.temperature_2m, i)),
    rainProb: Math.round(n(h?.precipitation_probability, i)),
    rainMm: Number(n(h?.precipitation, i).toFixed(1)),
  }));

  const days: DiaClima[] = (d?.time ?? []).map((date, i) => {
    const parsed = new Date(`${date}T12:00:00Z`);
    const info = describe(Math.round(n(d?.weather_code, i)));
    return {
      date,
      weekday: fmtWeekday.format(parsed).replace('.', ''),
      day: fmtDay.format(parsed),
      tempMax: Math.round(n(d?.temperature_2m_max, i)),
      tempMin: Math.round(n(d?.temperature_2m_min, i)),
      rainProb: Math.round(n(d?.precipitation_probability_max, i)),
      rainMm: Number(n(d?.precipitation_sum, i).toFixed(1)),
      uv: Math.round(n(d?.uv_index_max, i)),
      windMax: Math.round(n(d?.wind_speed_10m_max, i)),
      label: info.label,
      icon: info.icon,
    };
  });

  return { hours, days };
}

async function buscarHistorico(): Promise<DiaHistorico[]> {
  const { latitude, longitude } = NIOAQUE_COORDS;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
    `&timezone=${encodeURIComponent(TZ)}&past_days=30&forecast_days=1`;

  const data = await getJson<{
    daily?: { time?: string[]; temperature_2m_max?: Num; temperature_2m_min?: Num; precipitation_sum?: Num };
  }>(url);
  const d = data?.daily;

  return (d?.time ?? []).map((date, i) => ({
    date,
    day: date.slice(8, 10),
    tempMax: Math.round(n(d?.temperature_2m_max, i)),
    tempMin: Math.round(n(d?.temperature_2m_min, i)),
    rainMm: Number(n(d?.precipitation_sum, i).toFixed(1)),
  }));
}

async function buscarMeses(): Promise<MesHistorico[]> {
  const { latitude, longitude } = NIOAQUE_COORDS;
  const now = new Date();
  // O arquivo ERA5 tem ~5 dias de atraso; comecamos no 1o dia do mes de 11 meses atras.
  const [y, m] = isoDate(now).split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1 - 11, 1));
  const end = shiftDays(now, -6);

  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}` +
    `&start_date=${start.toISOString().slice(0, 10)}&end_date=${isoDate(end)}` +
    `&daily=temperature_2m_mean,precipitation_sum&timezone=${encodeURIComponent(TZ)}`;

  const data = await getJson<{
    daily?: { time?: string[]; temperature_2m_mean?: Num; precipitation_sum?: Num };
  }>(url);
  const d = data?.daily;
  if (!d?.time) return [];

  const acc = new Map<string, { rain: number; temp: number; count: number }>();
  d.time.forEach((date, i) => {
    const key = date.slice(0, 7);
    const cur = acc.get(key) ?? { rain: 0, temp: 0, count: 0 };
    cur.rain += n(d.precipitation_sum, i);
    cur.temp += n(d.temperature_2m_mean, i);
    cur.count += 1;
    acc.set(key, cur);
  });

  return [...acc.entries()].map(([key, v]) => ({
    label: fmtMonth.format(new Date(`${key}-15T12:00:00Z`)).replace('.', ''),
    rainMm: Math.round(v.rain),
    tempAvg: Number((v.temp / v.count).toFixed(1)),
  }));
}

/* -------------------------------------------------------------------------- */

export async function getClimaPagina(locals: App.Locals): Promise<ClimaPagina> {
  const cache = locals.runtime?.caches?.default;

  try {
    const hit = await cache?.match(CACHE_URL);
    if (hit) return (await hit.json()) as ClimaPagina;
  } catch {
    /* sem cache */
  }

  const [previsao, history, months] = await Promise.all([
    buscarPrevisao(),
    buscarHistorico(),
    buscarMeses(),
  ]);

  const ok = previsao.days.length > 0;
  if (!ok && history.length === 0) return EMPTY;

  const payload: ClimaPagina = {
    ...previsao,
    history,
    months,
    generatedAt: new Date().toISOString(),
    ok,
  };

  if (ok) {
    try {
      const response = new Response(JSON.stringify(payload), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      }) as unknown as Parameters<NonNullable<typeof cache>['put']>[1];
      await cache?.put(CACHE_URL, response);
    } catch {
      /* segue sem cache */
    }
  }

  return payload;
}
