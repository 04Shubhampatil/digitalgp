import { getPublicWeather } from "@/features/weather/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/** Current weather and a 5-day forecast for the website's location (live when configured, otherwise manual). */
export const GET = publicRoute<Params>(async (req, { params }) => {
  // ?lang=mr asks the provider for the condition text in Marathi; anything else is English.
  const lang = new URL(req.url).searchParams.get("lang") === "mr" ? "mr" : "en";
  return ok(await getPublicWeather(params.tenantSlug, lang), { headers: { "cache-control": "public, max-age=900, s-maxage=900" } });
});
