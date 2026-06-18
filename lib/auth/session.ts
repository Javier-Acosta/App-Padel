import { cookies } from "next/headers";

import type { UserRole } from "@/lib/domain/reservations";
import {
  authenticatePocketBaseUser,
  createPocketBaseRecord,
  PocketBaseRequestError,
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

export class AuthInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthInputError";
  }
}

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
    throw new AuthInputError(`${field} is required.`);
  }

  return value.trim();
}

export function parseRegisterInput(input: unknown): RegisterInput {
  if (!input || typeof input !== "object") {
    throw new AuthInputError("Invalid registration data.");
  }

  const payload = input as Record<string, unknown>;
  const name = assertNonEmptyString(payload.name, "name");
  const email = assertNonEmptyString(payload.email, "email").toLowerCase();
  const phone = assertNonEmptyString(payload.phone, "phone");
  const password = assertNonEmptyString(payload.password, "password");

  if (password.length < 8) {
    throw new AuthInputError("password must be at least 8 characters.");
  }

  return {
    name,
    email,
    phone,
    password,
  };
}

export function parseLoginInput(input: unknown): LoginInput {
  if (!input || typeof input !== "object") {
    throw new AuthInputError("Invalid login data.");
  }

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
  try {
    await createPocketBaseRecord<PocketBaseUserRecord>("users", {
      name: input.name,
      email: input.email,
      emailVisibility: true,
      phone: input.phone,
      role: "user",
      password: input.password,
      passwordConfirm: input.password,
    });
  } catch (error) {
    if (error instanceof PocketBaseRequestError && error.status === 400) {
      throw new AuthInputError("No pudimos crear la cuenta con esos datos.");
    }

    throw error;
  }

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
    return sanitizeUser(auth.record);
  } catch {
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
