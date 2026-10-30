/** Shapes returned by an OpenWeatherMap-compatible API (only the fields used here). */
export interface ProviderCurrent {
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  weather: { description: string; icon: string }[];
}

export interface ProviderForecastItem {
  dt_txt: string;
  main: { temp_min: number; temp_max: number };
  weather: { icon: string }[];
}

export interface WeatherDto {
  source: "live" | "manual";
  location: string | null;
  current: { temperature: string; humidity: string; wind: string; feelsLike: string; condition: string } | null;
  /** Next days, one entry per date, from the provider's 3-hourly forecast. */
  forecast: { date: string; icon: string; maxTemp: string; minTemp: string }[];
  fetchedAt: string;
}

/** Map the provider's current conditions to the display fields used on the site (metric units). */
export function toCurrent(c: ProviderCurrent): NonNullable<WeatherDto["current"]> {
  return {
    temperature: `${Math.round(c.main.temp)}°C`,
    feelsLike: `${Math.round(c.main.feels_like)}°C`,
    humidity: `${Math.round(c.main.humidity)}%`,
    wind: `${Math.round(c.wind.speed * 3.6)} km/h`,
    condition: c.weather[0]?.description ?? "",
  };
}

/** Collapse the 3-hourly forecast into one row per day (max/min temperature, midday icon), skipping today. */
export function toDaily(items: ProviderForecastItem[], today: string, days = 5): WeatherDto["forecast"] {
  const byDate = new Map<string, { max: number; min: number; icon: string; hour: number }>();
  for (const item of items) {
    const [date, time = "00:00:00"] = item.dt_txt.split(" ");
    if (!date || date <= today) continue;
    const hour = Number(time.slice(0, 2));
    const icon = item.weather[0]?.icon ?? "";
    const entry = byDate.get(date);
    if (!entry) {
      byDate.set(date, { max: item.main.temp_max, min: item.main.temp_min, icon, hour });
      continue;
    }
    entry.max = Math.max(entry.max, item.main.temp_max);
    entry.min = Math.min(entry.min, item.main.temp_min);
    // Use the icon closest to midday as the day's summary.
    if (Math.abs(hour - 12) < Math.abs(entry.hour - 12)) {
      entry.icon = icon;
      entry.hour = hour;
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, days)
    .map(([date, v]) => ({ date, icon: v.icon, maxTemp: `${Math.round(v.max)}°C`, minTemp: `${Math.round(v.min)}°C` }));
}
