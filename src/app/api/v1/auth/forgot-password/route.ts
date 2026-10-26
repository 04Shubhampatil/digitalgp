import { requestPasswordReset } from "@/features/auth/service";
import { forgotPasswordSchema } from "@/features/auth/validators";
import { getClientInfo, ok, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

export const POST = publicRoute(async (req) => {
  const { email } = await parseBody(req, forgotPasswordSchema);
  await requestPasswordReset(email, getClientInfo(req));
  // Always 200 — never reveal whether the account exists.
  return ok({ message: "If an account exists for this email, a reset link has been sent." });
});
