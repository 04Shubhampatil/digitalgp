import type { WeatherDto } from "@/features/weather/provider";

/**
 * WeatherAPI.com adapter (https://www.weatherapi.com/docs/). One call to `forecast.json` returns the current
 * conditions, the sunrise / sunset of today and a daily forecast, already in metric units and, with `lang=mr`,
 * the condition text in Marathi.
 */

export interface WeatherApiForecastResponse {
  location: { name: string; region?: string; country?: string; localtime?: string };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    wind_dir?: string;
    vis_km?: number;
    condition: { text: string; code: number };
  };
  forecast: {
    forecastday: {
      date: string;
      day: { maxtemp_c: number; mintemp_c: number; condition: { text: string; code: number } };
      astro?: { sunrise?: string; sunset?: string };
    }[];
  };
}

/**
 * The site picks a forecast icon from words ("rain", "cloud", "part"…), so icons come from the condition code,
 * not the text: the text may be in Marathi. Codes: https://www.weatherapi.com/docs/weather_conditions.json
 */
export function iconForCode(code: number): string {
  if (code === 1000) return "clear";
  if (code === 1003) return "partly-cloudy";
  if (code === 1006 || code === 1009) return "cloudy";
  if (code === 1030 || code === 1135 || code === 1147) return "fog";
  if (code === 1087 || (code >= 1273 && code <= 1282)) return "thunder";
  if (code === 1063 || code === 1072 || (code >= 1150 && code <= 1201) || (code >= 1240 && code <= 1246)) return "rain";
  return "clear";
}

/** "06:43 AM" -> "6:43 AM" (the provider already gives the local clock of the place). */
const trimClock = (s?: string) => (s ? s.replace(/^0(\d:)/, "$1") : undefined);

export function fromWeatherApi(res: WeatherApiForecastResponse, days = 5): Omit<WeatherDto, "source" | "location" | "fetchedAt"> {
  const c = res.current;
  const [today, ...next] = res.forecast.forecastday;
  const sunrise = trimClock(today?.astro?.sunrise);
  const sunset = trimClock(today?.astro?.sunset);
  return {
    current: {
      temperature: `${Math.round(c.temp_c)}°C`,
      feelsLike: `${Math.round(c.feelslike_c)}°C`,
      humidity: `${Math.round(c.humidity)}%`,
      wind: `${Math.round(c.wind_kph)} km/h${c.wind_dir ? ` ${c.wind_dir}` : ""}`,
      condition: c.condition.text.trim(),
      ...(typeof c.vis_km === "number" ? { visibility: `${Math.round(c.vis_km * 10) / 10} km` } : {}),
      ...(sunrise ? { sunrise } : {}),
      ...(sunset ? { sunset } : {}),
    },
    forecast: next.slice(0, days).map((d) => ({
      date: d.date,
      icon: iconForCode(d.day.condition.code),
      maxTemp: `${Math.round(d.day.maxtemp_c)}°C`,
      minTemp: `${Math.round(d.day.mintemp_c)}°C`,
    })),
  };
}

/** Fetch from WeatherAPI.com. Throws on any provider error; the caller falls back to the manual figures. */
export async function fetchWeatherApi(baseUrl: string, key: string, place: string, lang: "en" | "mr"): Promise<Omit<WeatherDto, "source" | "location" | "fetchedAt">> {
  const url = `${baseUrl.replace(/\/$/, "")}/forecast.json?key=${encodeURIComponent(key)}&q=${encodeURIComponent(place)}&days=6&aqi=no&alerts=no&lang=${lang}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error("weather provider error");
  return fromWeatherApi((await res.json()) as WeatherApiForecastResponse);
}
