/**
 * weather.ts
 * -----------------------------------------------------------------------------
 * Clima em tempo real de Nioaque (MS) via Open-Meteo (API gratuita, sem chave).
 *
 * Coordenadas: lat -21.1353 / lon -55.8300 (centro de Nioaque).
 * Cache: 15 minutos na borda (Cloudflare Cache API via `locals.runtime.caches`),
 * com fallback offline.
 *
 * Traz o retrato completo que o morador espera: temperatura, sensação, umidade,
 * vento, chance de chuva, nascer/pôr do sol e a previsão dos próximos dias.
 */

export const NIOAQUE_COORDS = {
  latitude: -21.1353,
  longitude: -55.83,
  label: 'Nioaque, MS',
} as const;

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_SECONDS = 15 * 60;
const CACHE_URL = 'https://cache.o-nioaquense.internal/weather/nioaque';
const REQUEST_TIMEOUT_MS = 4000;
const FORECAST_DAYS = 6;

export type WeatherIcon = 'sun' | 'cloud' | 'rain' | 'storm' | 'fog' | 'snow';

export interface WeatherDay {
  /** Data ISO (YYYY-MM-DD). */
  date: string;
  /** Rotulo curto: "Sex". */
  weekday: string;
  /** Dia do mes: "23". */
  day: string;
  tempMax: number;
  tempMin: number;
  rainChance: number;
}

export interface WeatherNow {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  isDay: boolean;
  code: number;
  label: string;
  icon: WeatherIcon;
  observedAt: string;
  tempMin: number;
  tempMax: number;
  rainChance: number;
  sunrise: string;
  sunset: string;
  forecast: WeatherDay[];
  source: 'open-meteo' | 'fallback';
}

/* -------------------------------------------------------------------------- */
/* Codigos WMO                                                                 */
/* -------------------------------------------------------------------------- */

const WMO: Record<number, { label: string; icon: WeatherIcon }> = {
  0: { label: 'Ceu limpo', icon: 'sun' },
  1: { label: 'Predominantemente ensolarado', icon: 'sun' },
  2: { label: 'Parcialmente nublado', icon: 'cloud' },
  3: { label: 'Tempo nublado', icon: 'cloud' },
  45: { label: 'Nevoeiro', icon: 'fog' },
  48: { label: 'Nevoeiro com geada', icon: 'fog' },
  51: { label: 'Garoa fraca', icon: 'rain' },
  53: { label: 'Garoa', icon: 'rain' },
  55: { label: 'Garoa intensa', icon: 'rain' },
  56: { label: 'Garoa gelada', icon: 'rain' },
  57: { label: 'Garoa gelada intensa', icon: 'rain' },
  61: { label: 'Chuva fraca', icon: 'rain' },
  63: { label: 'Chuva', icon: 'rain' },
  65: { label: 'Chuva forte', icon: 'rain' },
  66: { label: 'Chuva gelada', icon: 'rain' },
  67: { label: 'Chuva gelada forte', icon: 'rain' },
  71: { label: 'Neve fraca', icon: 'snow' },
  73: { label: 'Neve', icon: 'snow' },
  75: { label: 'Neve forte', icon: 'snow' },
  77: { label: 'Graos de neve', icon: 'snow' },
  80: { label: 'Pancadas de chuva', icon: 'rain' },
  81: { label: 'Pancadas de chuva', icon: 'rain' },
  82: { label: 'Pancadas fortes', icon: 'rain' },
  85: { label: 'Pancadas de neve', icon: 'snow' },
  86: { label: 'Pancadas de neve fortes', icon: 'snow' },
  95: { label: 'Trovoadas', icon: 'storm' },
  96: { label: 'Trovoadas com granizo', icon: 'storm' },
  99: { label: 'Trovoadas severas', icon: 'storm' },
};

function describe(code: number): { label: string; icon: WeatherIcon } {
  return WMO[code] ?? { label: 'Tempo indefinido', icon: 'cloud' };
}

/* -------------------------------------------------------------------------- */
/* Cache na borda                                                              */
/* -------------------------------------------------------------------------- */

async function readCache(locals: App.Locals): Promise<WeatherNow | null> {
  const cache = locals.runtime?.caches?.default;
  if (!cache) return null;

  try {
    const response = await cache.match(CACHE_URL);
    if (!response) return null;
    return (await response.json()) as WeatherNow;
  } catch {
    return null;
  }
}

async function writeCache(locals: App.Locals, payload: WeatherNow): Promise<void> {
  const cache = locals.runtime?.caches?.default;
  if (!cache) return;

  try {
    // A API de cache do Cloudflare usa o proprio tipo Response (workers-types)
    const response = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      },
    }) as unknown as Parameters<typeof cache.put>[1];

    await cache.put(CACHE_URL, response);
  } catch {
    /* cache indisponivel: seguimos sem cache */
  }
}

/* -------------------------------------------------------------------------- */
/* Consulta                                                                    */
/* -------------------------------------------------------------------------- */

function formatClock(iso: string | undefined): string {
  if (!iso) return '--:--';
  const time = iso.split('T')[1];
  return time ? time.slice(0, 5) : '--:--';
}

function buildForecast(
  times: string[] | undefined,
  maxes: number[] | undefined,
  mins: number[] | undefined,
  rains: number[] | undefined,
): WeatherDay[] {
  if (!times) return [];

  return times.slice(0, FORECAST_DAYS).map((date, index) => {
    const parsed = new Date(`${date}T12:00:00Z`);

    return {
      date,
      weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
        .format(parsed)
        .replace('.', ''),
      day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: 'UTC' }).format(parsed),
      tempMax: Math.round(maxes?.[index] ?? 0),
      tempMin: Math.round(mins?.[index] ?? 0),
      rainChance: Math.round(rains?.[index] ?? 0),
    };
  });
}

const FALLBACK: WeatherNow = {
  temperature: 29,
  feelsLike: 31,
  humidity: 58,
  windSpeed: 9,
  precipitation: 0,
  isDay: true,
  code: 3,
  label: 'Tempo nublado',
  icon: 'cloud',
  observedAt: new Date().toISOString(),
  tempMin: 22,
  tempMax: 34,
  rainChance: 40,
  sunrise: '05:06',
  sunset: '17:48',
  forecast: [],
  source: 'fallback',
};

/** Clima atual + previsao de Nioaque. Nunca lanca. */
export async function getNioaqueWeather(locals: App.Locals): Promise<WeatherNow> {
  const cached = await readCache(locals);
  if (cached) return cached;

  const url =
    `${ENDPOINT}?latitude=${NIOAQUE_COORDS.latitude}&longitude=${NIOAQUE_COORDS.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,' +
    'weather_code,wind_speed_10m,is_day' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
    `&timezone=America%2FCampo_Grande&forecast_days=${FORECAST_DAYS}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return FALLBACK;

    const data = (await response.json()) as {
      current?: {
        time?: string;
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        precipitation?: number;
        weather_code?: number;
        wind_speed_10m?: number;
        is_day?: number;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
        sunrise?: string[];
        sunset?: string[];
      };
    };

    const current = data.current;
    if (!current || typeof current.temperature_2m !== 'number') return FALLBACK;

    const code = current.weather_code ?? 0;
    const { label, icon } = describe(code);
    const forecast = buildForecast(
      data.daily?.time,
      data.daily?.temperature_2m_max,
      data.daily?.temperature_2m_min,
      data.daily?.precipitation_probability_max,
    );

    const today = forecast[0];

    const payload: WeatherNow = {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      precipitation: Number((current.precipitation ?? 0).toFixed(1)),
      isDay: (current.is_day ?? 1) === 1,
      code,
      label,
      icon,
      observedAt: current.time ?? new Date().toISOString(),
      tempMin: today?.tempMin ?? 0,
      tempMax: today?.tempMax ?? 0,
      rainChance: today?.rainChance ?? 0,
      sunrise: formatClock(data.daily?.sunrise?.[0]),
      sunset: formatClock(data.daily?.sunset?.[0]),
      forecast,
      source: 'open-meteo',
    };

    await writeCache(locals, payload);
    return payload;
  } catch {
    return FALLBACK;
  }
}
