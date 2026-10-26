import { logout } from "@/features/auth/service";
import { clearSessionCookie, readSessionToken } from "@/lib/auth";
import { authedRoute, getClientInfo, noContent } from "@/lib/http";

export const POST = authedRoute(async (req, { auth }) => {
  const token = readSessionToken(req);
  if (token) await logout(auth, token, getClientInfo(req));
  const res = noContent();
  clearSessionCookie(res);
  return res;
});
