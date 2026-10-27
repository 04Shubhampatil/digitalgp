import type { CurrentUserDto } from "@/types/api";
import { apiFetch } from "./client";

/** Client-side auth calls (browser). Server Components use `getCurrentUser` in lib/session.ts. */
export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export function login(input: LoginInput): Promise<{ expiresAt: string }> {
  return apiFetch<{ expiresAt: string }>("/auth/login", { method: "POST", body: input });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function me(): Promise<CurrentUserDto> {
  return apiFetch<CurrentUserDto>("/auth/me");
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, password: string): Promise<void> {
  return apiFetch<void>("/auth/reset-password", { method: "POST", body: { token, password } });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiFetch<void>("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
}
