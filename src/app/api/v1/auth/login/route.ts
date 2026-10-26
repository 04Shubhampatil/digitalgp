import { login } from "@/features/auth/service";
import { loginSchema } from "@/features/auth/validators";
import { setSessionCookie } from "@/lib/auth";
import { getClientInfo, ok, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  const input = await parseBody(req, loginSchema);
  const session = await login(input, getClientInfo(req));
  const res = ok({ expiresAt: session.expiresAt.toISOString() });
  setSessionCookie(res, session.token, session.expiresAt);
  return res;
});
