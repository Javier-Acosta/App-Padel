#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");

const testUsers = [
  {
    name: "Jugador Demo",
    email: "jugador.demo@app-padel.test",
    phone: "1100000001",
    role: "user",
    password: "AppPadel123!",
  },
  {
    name: "Admin Demo",
    email: "admin.demo@app-padel.test",
    phone: "1100000002",
    role: "admin",
    password: "AppPadel123!",
  },
];

function loadDotEnv(text) {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

try {
  loadDotEnv(await readFile(envPath, "utf8"));
} catch {
  // Hosted environments may provide variables directly.
}

const requiredEnv = [
  "POCKETBASE_URL",
  "POCKETBASE_ADMIN_EMAIL",
  "POCKETBASE_ADMIN_PASSWORD",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required env vars: ${missingEnv.join(", ")}`);
}

const baseUrl = process.env.POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

function pbUrl(pathname, searchParams = {}) {
  const url = new URL(pathname, baseUrl);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function request(pathname, options = {}) {
  const response = await fetch(pbUrl(pathname, options.searchParams), {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `PocketBase ${options.method ?? "GET"} ${pathname} failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  return payload;
}

async function authenticate() {
  const body = {
    identity: adminEmail,
    password: adminPassword,
  };

  try {
    return await request("/api/collections/_superusers/auth-with-password", {
      method: "POST",
      body,
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("404")) {
      throw error;
    }

    return request("/api/admins/auth-with-password", {
      method: "POST",
      body,
    });
  }
}

function escapeFilterValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function findUser(token, email) {
  const result = await request("/api/collections/users/records", {
    token,
    searchParams: {
      page: 1,
      perPage: 1,
      filter: `email = "${escapeFilterValue(email)}"`,
    },
  });

  return result.items[0] ?? null;
}

async function upsertUser(token, user) {
  const existing = await findUser(token, user.email);
  const body = {
    name: user.name,
    email: user.email,
    emailVisibility: true,
    phone: user.phone,
    role: user.role,
  };

  if (existing) {
    await request(`/api/collections/users/records/${existing.id}`, {
      method: "PATCH",
      token,
      body,
    });
    console.log(`ok user ${user.email}`);
    return;
  }

  await request("/api/collections/users/records", {
    method: "POST",
    token,
    body: {
      ...body,
      password: user.password,
      passwordConfirm: user.password,
    },
  });
  console.log(`created user ${user.email}`);
}

const auth = await authenticate();
const token = auth.token;

console.log("connected to PocketBase");

for (const user of testUsers) {
  await upsertUser(token, user);
}

console.log("PocketBase test users seed complete");
console.log("Test password for seeded users: AppPadel123!");

