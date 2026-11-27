import { z } from "zod";
import type { ModuleKey } from "@/types/api";
import { passwordSchema } from "@/lib/validation";

/** Translated messages for the client-side account checks (the server repeats every check). */
export interface AccountMessages {
  required: string;
  email: string;
  phone: string;
  password: string;
  modules: string;
}

export interface AccountValues {
  name: string;
  email: string;
  phone: string;
  /** true = the server generates a temporary password; false = `password` is used. */
  generate: boolean;
  password: string;
}
export interface OperatorValues extends AccountValues {
  modules: { moduleKey: ModuleKey; canWrite: boolean }[];
}

export const emptyAccount = (): AccountValues => ({ name: "", email: "", phone: "", generate: true, password: "" });
export const emptyOperator = (): OperatorValues => ({ ...emptyAccount(), modules: [] });

/** Same rules as POST /users (name, email, optional phone, password min 10 with letters + numbers). */
export function accountShape(m: AccountMessages) {
  return {
    name: z.string().trim().min(1, m.required).max(200),
    email: z.string().trim().min(1, m.required).max(254).pipe(z.email(m.email)),
    phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, m.phone).or(z.literal("")),
    generate: z.boolean(),
    password: z.string().max(128, m.password),
  };
}

/** Password is only checked when the user typed one instead of generating it. */
export function checkTypedPassword(a: Pick<AccountValues, "generate" | "password">, path: (string | number)[], ctx: z.RefinementCtx, m: AccountMessages) {
  if (!a.generate && !passwordSchema.safeParse(a.password).success) ctx.addIssue({ code: "custom", path: [...path, "password"], message: m.password });
}

/** Request body part for one account: the password is sent only when typed. */
export function toAccountBody(a: AccountValues) {
  return { name: a.name.trim(), email: a.email.trim(), phone: a.phone.trim() || null, ...(a.generate ? {} : { password: a.password }) };
}

/** Server messages (English) → the signed-in language. Unknown messages fall back to the generic text. */
export function translateServerMessage(message: string, t: (key: string) => string, fallback: string): string {
  if (message === "A user with this email already exists") return t("emailTaken");
  if (message === "This website address is already taken") return t("slugTaken");
  if (message === "This email is used more than once") return t("dupEmail");
  if (message === "This Gram Panchayat already has a website") return t("alreadyHasWebsite");
  return fallback;
}
