#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");

const defaultCourts = ["Cancha 1", "Cancha 2", "Cancha 3"];

const defaultOpeningHours = {
  monday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
  tuesday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
  wednesday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
  thursday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
  friday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
  saturday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
  sunday: { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
};

const defaultSettings = {
  key: "default",
  openingHours: defaultOpeningHours,
  basePrice: 12000,
  depositAmount: 3000,
  paymentHoldMinutes: 10,
  cancellationCutoffHours: 3,
};

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

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

async function findFirstRecord(token, collection, filter) {
  const result = await request(`/api/collections/${collection}/records`, {
    token,
    searchParams: {
      page: 1,
      perPage: 1,
      filter,
    },
  });

  return result.items[0] ?? null;
}

async function createRecord(token, collection, body) {
  return request(`/api/collections/${collection}/records`, {
    method: "POST",
    token,
    body,
  });
}

async function updateRecord(token, collection, id, body) {
  return request(`/api/collections/${collection}/records/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

async function upsertCourt(token, name) {
  const existing = await findFirstRecord(
    token,
    "courts",
    `name = "${escapeFilterValue(name)}"`,
  );

  if (existing) {
    if (existing.active !== true) {
      await updateRecord(token, "courts", existing.id, { active: true });
      console.log(`updated court ${name}`);
      return;
    }

    console.log(`ok court ${name}`);
    return;
  }

  await createRecord(token, "courts", {
    name,
    active: true,
  });
  console.log(`created court ${name}`);
}

async function upsertClubSettings(token) {
  const existing = await findFirstRecord(
    token,
    "club_settings",
    `key = "${defaultSettings.key}"`,
  );

  if (existing) {
    if (stableStringify(existing.openingHours) !== stableStringify(defaultOpeningHours)) {
      await updateRecord(token, "club_settings", existing.id, {
        openingHours: defaultOpeningHours,
      });
      console.log("updated club_settings default opening hours");
      return;
    }

    console.log("ok club_settings default");
    return;
  }

  await createRecord(token, "club_settings", defaultSettings);
  console.log("created club_settings default");
}

const auth = await authenticate();
const token = auth.token;

console.log("connected to PocketBase");

await upsertClubSettings(token);

for (const court of defaultCourts) {
  await upsertCourt(token, court);
}

console.log("PocketBase seed complete");

