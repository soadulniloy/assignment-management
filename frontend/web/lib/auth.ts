import type { LoginResponse, Role, Session } from "./types";

const TOKEN_KEY = "am_token";
const SESSION_KEY = "am_session";

export const ROLE_HOME: Record<Role, string> = {
  Admin: "/admin",
  Teacher: "/teacher",
  Student: "/student",
};

/**
 * The login response already carries the user id, name, email and role, so
 * the frontend stores that alongside the JWT instead of decoding the token.
 */
export function saveLogin(res: LoginResponse): void {
  const session: Session = {
    userId: res.userId,
    name: res.name,
    email: res.email,
    role: res.role,
  };
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || typeof parsed.role !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return (
    getSession() !== null && localStorage.getItem(TOKEN_KEY) !== null
  );
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}
