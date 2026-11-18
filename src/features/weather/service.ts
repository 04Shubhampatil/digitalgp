import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { memoized } from "@/lib/memo-cache";
import { publishedSectionData } from "@/lib/published-section";
import { getPublicTenantBySlug } from "@/lib/tenant";
import { toCurrent, toDaily, type ProviderCurrent, type ProviderForecastItem, type WeatherDto } from "@/features/weather/provider";

/**
 * Public weather for a website. Uses the provider when WEATHER_API_KEY is set and the website has a
 * place to look up: the `place` of the Home "weather" section (typed by the admin, e.g. "Khed,IN"), else
 * settings.weather.location. Otherwise, or if the provider fails, returns the legacy manual figures of that
 * section (or none: the site then keeps its design card). Results are cached per website and language for
 * WEATHER_CACHE_MINUTES. The API key is never returned or logged.
 */
async function fetchLive(location: string, lang: "en" | "mr"): Promise<Omit<WeatherDto, "source" | "location">> {
  const { WEATHER_API_KEY, WEATHER_API_BASE_URL } = getEnv();
  const query = (path: string) => `${WEATHER_API_BASE_URL}/${path}?q=${encodeURIComponent(location)}&units=metric&lang=${lang}&appid=${WEATHER_API_KEY}`;
  const [currentRes, forecastRes] = await Promise.all([
    fetch(query("weather"), { signal: AbortSignal.timeout(5000) }),
    fetch(query("forecast"), { signal: AbortSignal.timeout(5000) }),
  ]);
  if (!currentRes.ok || !forecastRes.ok) throw new Error("weather provider error");
  const current = (await currentRes.json()) as ProviderCurrent;
  const forecast = (await forecastRes.json()) as { list: ProviderForecastItem[] };
  return {
    current: toCurrent(current),
    forecast: toDaily(forecast.list, new Date().toISOString().slice(0, 10)),
    fetchedAt: new Date().toISOString(),
  };
}

type HomeWeatherSection = { location?: string; place?: string; current?: WeatherDto["current"]; forecast?: WeatherDto["forecast"] } | null;

async function manualWeather(tenantId: string, location: string | null, section?: HomeWeatherSection): Promise<WeatherDto> {
  const data = section === undefined ? ((await publishedSectionData(tenantId, "home", "weather")) as HomeWeatherSection) : section;
  return {
    source: "manual",
    location,
    current: data?.current ?? null,
    forecast: data?.forecast ?? [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function getPublicWeather(tenantSlug: string, lang: "en" | "mr" = "en"): Promise<WeatherDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const row = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id }, select: { settings: true } });
  const section = (await publishedSectionData(tenant.id, "home", "weather")) as HomeWeatherSection;
  const place = section?.place?.trim() || (row.settings as { weather?: { location?: string } } | null)?.weather?.location || null;
  // What the card shows as the place; the lookup name is used when the section has no display text.
  const shown = section?.location?.trim() || place;
  const env = getEnv();
  if (!env.WEATHER_API_KEY || !place) return manualWeather(tenant.id, shown, section);

  try {
    const live = await memoized(`weather:${tenant.id}:${place}:${lang}`, env.WEATHER_CACHE_MINUTES * 60_000, () => fetchLive(place, lang));
    return { source: "live", location: shown, ...live };
  } catch {
    // Provider details are never surfaced; the page keeps working from the manual section.
    return manualWeather(tenant.id, shown, section);
  }
}
