import { getPublicWeather } from "@/features/weather/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/** Current weather and a 5-day forecast for the website's location (live when configured, otherwise manual). */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicWeather(params.tenantSlug), { headers: { "cache-control": "public, max-age=900, s-maxage=900" } });
});
