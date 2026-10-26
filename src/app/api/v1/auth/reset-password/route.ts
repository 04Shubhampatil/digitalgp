import { resetPassword } from "@/features/auth/service";
import { resetPasswordSchema } from "@/features/auth/validators";
import { getClientInfo, ok, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  await resetPassword(token, password, getClientInfo(req));
  return ok({ message: "Password updated. Please sign in again." });
});
