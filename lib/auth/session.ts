import { cookies } from "next/headers";

import type { UserRole } from "@/lib/domain/reservations";
import {
  authenticatePocketBaseUser,
  createPocketBaseRecord,
  refreshPocketBaseUserAuth,
} from "@/lib/pocketbase/client";

export const AUTH_COOKIE_NAME = "app_padel_auth";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};

type PocketBaseUserRecord = AuthUser & {
  verified?: boolean;
  created: string;
  updated: string;
};

type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

function sanitizeUser(record: PocketBaseUserRecord): AuthUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    role: record.role,
  };
}

function assertNonEmptyString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

export function parseRegisterInput(input: unknown): RegisterInput {
  const payload = input as Record<string, unknown>;
  const name = assertNonEmptyString(payload.name, "name");
  const email = assertNonEmptyString(payload.email, "email").toLowerCase();
  const phone = assertNonEmptyString(payload.phone, "phone");
  const password = assertNonEmptyString(payload.password, "password");

  if (password.length < 8) {
    throw new Error("password must be at least 8 characters.");
  }

  return {
    name,
    email,
    phone,
    password,
  };
}

export function parseLoginInput(input: unknown): LoginInput {
  const payload = input as Record<string, unknown>;

  return {
    email: assertNonEmptyString(payload.email, "email").toLowerCase(),
    password: assertNonEmptyString(payload.password, "password"),
  };
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function registerUser(input: RegisterInput) {
  await createPocketBaseRecord<PocketBaseUserRecord>("users", {
    name: input.name,
    email: input.email,
    emailVisibility: true,
    phone: input.phone,
    role: "user",
    password: input.password,
    passwordConfirm: input.password,
  });

  return loginUser({
    email: input.email,
    password: input.password,
  });
}

export async function loginUser(input: LoginInput) {
  const auth = await authenticatePocketBaseUser<PocketBaseUserRecord>(
    input.email,
    input.password,
  );

  await setAuthCookie(auth.token);

  return sanitizeUser(auth.record);
}

export async function getCurrentUser() {
  const token = await getAuthToken();

  if (!token) {
    return null;
  }

  try {
    const auth = await refreshPocketBaseUserAuth<PocketBaseUserRecord>(token);

    await setAuthCookie(auth.token);

    return sanitizeUser(auth.record);
  } catch {
    await clearAuthCookie();
    return null;
  }
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (user.role !== "admin") {
    throw new Error("Forbidden.");
  }

  return user;
}
