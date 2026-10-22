/**
 * weather.ts
 * -----------------------------------------------------------------------------
 * Clima em tempo real de Nioaque (MS) via Open-Meteo (API gratuita, sem chave).
 *
 * Coordenadas: lat -21.1353 / lon -55.8300 (centro de Nioaque).
 * Cache: 15 minutos na borda (Cloudflare Cache API via `locals.runtime.caches`),
 * com fallback para dados de exemplo quando a API estiver indisponivel.
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

export type WeatherIcon = 'sun' | 'cloud' | 'rain' | 'storm' | 'fog' | 'snow';

export interface WeatherNow {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
  code: number;
  label: string;
  icon: WeatherIcon;
  observedAt: string;
  source: 'open-meteo' | 'fallback';
}

/* -------------------------------------------------------------------------- */
/* Codigos WMO                                                                 */
/* -------------------------------------------------------------------------- */

const WMO: Record<number, { label: string; icon: WeatherIcon }> = {
  0: { label: 'Ceu limpo', icon: 'sun' },
  1: { label: 'Predominantemente ensolarado', icon: 'sun' },
  2: { label: 'Parcialmente nublado', icon: 'cloud' },
  3: { label: 'Encoberto', icon: 'cloud' },
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

const FALLBACK: WeatherNow = {
  temperature: 29,
  feelsLike: 31,
  humidity: 58,
  windSpeed: 9,
  isDay: true,
  code: 1,
  label: 'Predominantemente ensolarado',
  icon: 'sun',
  observedAt: new Date().toISOString(),
  source: 'fallback',
};

/** Clima atual de Nioaque. Nunca lanca: devolve `null` apenas em caso extremo. */
export async function getNioaqueWeather(locals: App.Locals): Promise<WeatherNow> {
  const cached = await readCache(locals);
  if (cached) return cached;

  const url =
    `${ENDPOINT}?latitude=${NIOAQUE_COORDS.latitude}&longitude=${NIOAQUE_COORDS.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
    '&timezone=America%2FCampo_Grande';

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
        weather_code?: number;
        wind_speed_10m?: number;
        is_day?: number;
      };
    };

    const current = data.current;
    if (!current || typeof current.temperature_2m !== 'number') return FALLBACK;

    const code = current.weather_code ?? 0;
    const { label, icon } = describe(code);

    const payload: WeatherNow = {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      isDay: (current.is_day ?? 1) === 1,
      code,
      label,
      icon,
      observedAt: current.time ?? new Date().toISOString(),
      source: 'open-meteo',
    };

    await writeCache(locals, payload);
    return payload;
  } catch {
    return FALLBACK;
  }
}
