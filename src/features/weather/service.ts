import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { memoized } from "@/lib/memo-cache";
import { publishedSectionData } from "@/lib/published-section";
import { getPublicTenantBySlug } from "@/lib/tenant";
import { toCurrent, toDaily, type ProviderCurrent, type ProviderForecastItem, type WeatherDto } from "@/features/weather/provider";

/**
 * Public weather for a website. Uses the provider when WEATHER_API_KEY is set and the website has a
 * location (settings.weather.location); otherwise, or if the provider fails, returns the manual
 * "weather" section published on Home. Results are cached per website for WEATHER_CACHE_MINUTES.
 * The API key is never returned or logged.
 */
async function fetchLive(location: string): Promise<Omit<WeatherDto, "source" | "location">> {
  const { WEATHER_API_KEY, WEATHER_API_BASE_URL } = getEnv();
  const query = (path: string) => `${WEATHER_API_BASE_URL}/${path}?q=${encodeURIComponent(location)}&units=metric&appid=${WEATHER_API_KEY}`;
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

async function manualWeather(tenantId: string, location: string | null): Promise<WeatherDto> {
  const data = (await publishedSectionData(tenantId, "home", "weather")) as {
    current?: WeatherDto["current"];
    forecast?: WeatherDto["forecast"];
  } | null;
  return {
    source: "manual",
    location,
    current: data?.current ?? null,
    forecast: data?.forecast ?? [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function getPublicWeather(tenantSlug: string): Promise<WeatherDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const row = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id }, select: { settings: true } });
  const location = (row.settings as { weather?: { location?: string } } | null)?.weather?.location ?? null;
  const env = getEnv();
  if (!env.WEATHER_API_KEY || !location) return manualWeather(tenant.id, location);

  try {
    const live = await memoized(`weather:${tenant.id}`, env.WEATHER_CACHE_MINUTES * 60_000, () => fetchLive(location));
    return { source: "live", location, ...live };
  } catch {
    // Provider details are never surfaced; the page keeps working from the manual section.
    return manualWeather(tenant.id, location);
  }
}
