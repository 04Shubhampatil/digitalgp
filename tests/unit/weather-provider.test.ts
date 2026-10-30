import { describe, expect, it } from "vitest";
import { toCurrent, toDaily, type ProviderForecastItem } from "@/features/weather/provider";

describe("weather provider mapping", () => {
  it("maps current conditions to display units", () => {
    expect(
      toCurrent({ main: { temp: 31.4, feels_like: 36.2, humidity: 82.1 }, wind: { speed: 5 }, weather: [{ description: "partly cloudy", icon: "02d" }] }),
    ).toEqual({ temperature: "31°C", feelsLike: "36°C", humidity: "82%", wind: "18 km/h", condition: "partly cloudy" });
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
