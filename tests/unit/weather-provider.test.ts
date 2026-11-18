import { describe, expect, it } from "vitest";
import { toCurrent, toDaily, type ProviderForecastItem } from "@/features/weather/provider";

describe("weather provider mapping", () => {
  it("maps current conditions to display units", () => {
    expect(
      toCurrent({ main: { temp: 31.4, feels_like: 36.2, humidity: 82.1 }, wind: { speed: 5 }, weather: [{ description: "partly cloudy", icon: "02d" }] }),
    ).toEqual({ temperature: "31°C", feelsLike: "36°C", humidity: "82%", wind: "18 km/h", condition: "Partly Cloudy" });
  });

  it("adds wind direction, visibility and sunrise / sunset in the clock of the place", () => {
    // 2026-07-06 00:42 UTC = 6:12 AM in India (UTC+5:30); sunset 13:54 UTC = 7:24 PM.
    const cur = toCurrent({
      main: { temp: 31, feels_like: 36, humidity: 82 },
      wind: { speed: 5, deg: 315 },
      weather: [{ description: "scattered clouds", icon: "03d" }],
      visibility: 8000,
      sys: { sunrise: Date.UTC(2026, 6, 6, 0, 42) / 1000, sunset: Date.UTC(2026, 6, 6, 13, 54) / 1000 },
      timezone: 19800,
    });
    expect(cur).toMatchObject({ wind: "18 km/h NW", visibility: "8 km", sunrise: "6:12 AM", sunset: "7:24 PM", condition: "Scattered Clouds" });
  });

  it("leaves Marathi condition text as the provider wrote it", () => {
    expect(toCurrent({ main: { temp: 30, feels_like: 31, humidity: 50 }, wind: { speed: 1 }, weather: [{ description: "ढगाळ वातावरण", icon: "04d" }] }).condition).toBe("ढगाळ वातावरण");
  });

  it("collapses the 3-hourly forecast into one row per future day", () => {
    const item = (dt_txt: string, min: number, max: number, icon: string): ProviderForecastItem => ({
      dt_txt,
      main: { temp_min: min, temp_max: max },
      weather: [{ icon }],
    });
    const rows = toDaily(
      [
        item("2026-10-29 12:00:00", 20, 30, "01d"),
        item("2026-10-30 00:00:00", 18, 22, "02n"),
        item("2026-10-30 12:00:00", 21, 33, "01d"),
        item("2026-10-30 18:00:00", 24, 29, "10n"),
        item("2026-10-31 12:00:00", 19, 31, "03d"),
      ],
      "2026-10-29",
    );
    expect(rows).toEqual([
      { date: "2026-10-30", icon: "01d", maxTemp: "33°C", minTemp: "18°C" },
      { date: "2026-10-31", icon: "03d", maxTemp: "31°C", minTemp: "19°C" },
    ]);
  });
});
