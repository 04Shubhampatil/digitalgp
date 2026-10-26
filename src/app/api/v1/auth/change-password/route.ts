import { changePassword } from "@/features/auth/service";
import { changePasswordSchema } from "@/features/auth/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

export const POST = authedRoute(async (req, { auth }) => {
  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
  await changePassword(auth, currentPassword, newPassword, getClientInfo(req));
  return ok({ message: "Password changed." });
});
