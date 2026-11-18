import { describe, expect, it } from "vitest";
import { weatherProvider } from "@/features/weather/service";
import { fromWeatherApi, iconForCode, type WeatherApiForecastResponse } from "@/features/weather/weatherapi";

const day = (date: string, max: number, min: number, code: number, text = "x") => ({ date, day: { maxtemp_c: max, mintemp_c: min, condition: { text, code } } });

const sample: WeatherApiForecastResponse = {
  location: { name: "Khed", region: "Maharashtra", country: "India" },
  current: { temp_c: 31.4, feelslike_c: 35.6, humidity: 82, wind_kph: 17.6, wind_dir: "NW", vis_km: 8, condition: { text: "अंशतः ढगाळ", code: 1003 } },
  forecast: {
    forecastday: [
      { ...day("2026-07-06", 33, 24, 1003), astro: { sunrise: "06:12 AM", sunset: "07:24 PM" } },
      day("2026-07-07", 30.6, 23.2, 1189, "पाऊस"),
      day("2026-07-08", 29, 22, 1006),
    ],
  },
};

describe("WeatherAPI.com mapping", () => {
  it("maps current conditions, today's sunrise / sunset and the next days", () => {
    expect(fromWeatherApi(sample)).toEqual({
      current: { temperature: "31°C", feelsLike: "36°C", humidity: "82%", wind: "18 km/h NW", condition: "अंशतः ढगाळ", visibility: "8 km", sunrise: "6:12 AM", sunset: "7:24 PM" },
      forecast: [
        { date: "2026-07-07", icon: "rain", maxTemp: "31°C", minTemp: "23°C" },
        { date: "2026-07-08", icon: "cloudy", maxTemp: "29°C", minTemp: "22°C" },
      ],
    });
  });

  it("picks icons from the condition code, so Marathi text still gets the right icon", () => {
    expect([1000, 1003, 1009, 1135, 1087, 1195, 1243, 1213].map(iconForCode)).toEqual(["clear", "partly-cloudy", "cloudy", "fog", "thunder", "rain", "rain", "clear"]);
  });
});

describe("weather provider selection", () => {
  it("uses the named provider, or guesses it from the address, with the right default address", () => {
    expect(weatherProvider({})).toEqual({ name: "openweathermap", base: "https://api.openweathermap.org/data/2.5" });
    expect(weatherProvider({ WEATHER_PROVIDER: "weatherapi" })).toEqual({ name: "weatherapi", base: "https://api.weatherapi.com/v1" });
    expect(weatherProvider({ WEATHER_API_BASE_URL: "https://api.weatherapi.com/v1" })).toEqual({ name: "weatherapi", base: "https://api.weatherapi.com/v1" });
    // An OpenWeatherMap address left in the environment does not break the WeatherAPI.com setup.
    expect(weatherProvider({ WEATHER_PROVIDER: "weatherapi", WEATHER_API_BASE_URL: "https://api.openweathermap.org/data/2.5" })).toEqual({
      name: "weatherapi",
      base: "https://api.weatherapi.com/v1",
    });
  });
});
