#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(repoRoot, ".env.local");

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
  // CI or hosted environments may provide variables directly.
}

const requiredEnv = [
  "POCKETBASE_URL",
  "POCKETBASE_ADMIN_EMAIL",
  "POCKETBASE_ADMIN_PASSWORD",
];

const reservationDurationValues = Array.from({ length: 29 }, (_, index) =>
  String(60 + index * 30),
);

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required env vars: ${missingEnv.join(", ")}`);
}

const baseUrl = process.env.POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

function pbUrl(pathname) {
  return new URL(pathname, baseUrl);
}

async function request(pathname, options = {}) {
  const response = await fetch(pbUrl(pathname), {
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

function textField(name, options = {}) {
  return {
    name,
    type: "text",
    required: options.required ?? false,
    min: options.min ?? 0,
    max: options.max ?? 0,
    pattern: options.pattern ?? "",
  };
}

function boolField(name, options = {}) {
  return {
    name,
    type: "bool",
    required: options.required ?? false,
  };
}

function numberField(name, options = {}) {
  return {
    name,
    type: "number",
    required: options.required ?? false,
    min: options.min ?? null,
    max: options.max ?? null,
    onlyInt: options.onlyInt ?? false,
  };
}

function dateField(name, options = {}) {
  return {
    name,
    type: "date",
    required: options.required ?? false,
    min: options.min ?? "",
    max: options.max ?? "",
  };
}

function jsonField(name, options = {}) {
  return {
    name,
    type: "json",
    required: options.required ?? false,
    maxSize: options.maxSize ?? 0,
  };
}

function fileField(name, options = {}) {
  return {
    name,
    type: "file",
    required: options.required ?? false,
    maxSelect: options.maxSelect ?? 1,
    maxSize: options.maxSize ?? 5 * 1024 * 1024,
    mimeTypes: options.mimeTypes ?? [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ],
    thumbs: options.thumbs ?? ["0x80", "0x240"],
  };
}

function selectField(name, values, options = {}) {
  return {
    name,
    type: "select",
    required: options.required ?? false,
    values,
    maxSelect: options.maxSelect ?? 1,
  };
}

function relationField(name, collectionId, options = {}) {
  return {
    name,
    type: "relation",
    required: options.required ?? false,
    collectionId,
    cascadeDelete: options.cascadeDelete ?? false,
    minSelect: options.minSelect ?? 0,
    maxSelect: options.maxSelect ?? 1,
  };
}

function mergeByName(existingFields, requiredFields) {
  const existingByName = new Map(
    existingFields.map((field) => [field.name, field]),
  );
  const requiredByName = new Map(
    requiredFields.map((field) => [field.name, field]),
  );
  const missing = requiredFields.filter((field) => !existingByName.has(field.name));
  const changed = [];
  const fields = existingFields.map((existingField) => {
    const requiredField = requiredByName.get(existingField.name);

    if (!requiredField || existingField.type !== requiredField.type) {
      return existingField;
    }

    const mergedField = {
      ...existingField,
      ...requiredField,
    };

    if (JSON.stringify(mergedField) !== JSON.stringify(existingField)) {
      changed.push(mergedField);
    }

    return mergedField;
  });

  return {
    fields: [...fields, ...missing],
    missing,
    changed,
  };
}

function mergeIndexes(existingIndexes = [], requiredIndexes = []) {
  const seen = new Set(existingIndexes);
  const missing = requiredIndexes.filter((index) => !seen.has(index));

  return {
    indexes: [...existingIndexes, ...missing],
    missing,
  };
}

async function getCollection(token, name) {
  try {
    return await request(`/api/collections/${name}`, { token });
  } catch (error) {
    if (error instanceof Error && error.message.includes("(404)")) {
      return null;
    }

    throw error;
  }
}

async function upsertCollection(token, definition) {
  const existing = await getCollection(token, definition.name);

  if (!existing) {
    await request("/api/collections", {
      method: "POST",
      token,
      body: definition,
    });
    console.log(`created ${definition.name}`);
    return getCollection(token, definition.name);
  }

  const mergedFields = mergeByName(existing.fields ?? [], definition.fields ?? []);
  const mergedIndexes = mergeIndexes(existing.indexes ?? [], definition.indexes ?? []);
  const ruleKeys = [
    "listRule",
    "viewRule",
    "createRule",
    "updateRule",
    "deleteRule",
    "authRule",
  ];
  const changedRules = ruleKeys.filter(
    (key) => definition[key] !== undefined && existing[key] !== definition[key],
  );

  if (
    mergedFields.missing.length === 0 &&
    mergedFields.changed.length === 0 &&
    mergedIndexes.missing.length === 0 &&
    changedRules.length === 0
  ) {
    console.log(`ok ${definition.name}`);
    return existing;
  }

  await request(`/api/collections/${definition.name}`, {
    method: "PATCH",
    token,
    body: {
      ...definition,
      fields: mergedFields.fields,
      indexes: mergedIndexes.indexes,
    },
  });

  const fieldNames = mergedFields.missing.map((field) => field.name).join(", ");
  const changedFieldNames = mergedFields.changed
    .map((field) => field.name)
    .join(", ");
  const indexCount = mergedIndexes.missing.length;
  console.log(
    `updated ${definition.name}${fieldNames ? ` fields=[${fieldNames}]` : ""}${changedFieldNames ? ` changed=[${changedFieldNames}]` : ""}${indexCount ? ` indexes=${indexCount}` : ""}${changedRules.length ? ` rules=[${changedRules.join(", ")}]` : ""}`,
  );

  return getCollection(token, definition.name);
}

function buildDefinitions(ids = {}) {
  const authedOnly = '@request.auth.id != ""';
  const adminOnly = '@request.auth.id = "gh07go6mdt3ehaq"';
  const ownerOrAdmin = `${adminOnly} || userId = @request.auth.id`;

  return [
    {
      name: "users",
      type: "auth",
      listRule: adminOnly,
      viewRule: "@request.auth.id = id || @request.auth.role = \"admin\"",
      createRule: "",
      updateRule: "@request.auth.id = id || @request.auth.role = \"admin\"",
      deleteRule: adminOnly,
      authRule: "",
      passwordAuth: {
        enabled: true,
        identityFields: ["email"],
      },
      fields: [
        textField("name", { required: true, max: 120 }),
        textField("phone", { required: true, max: 40 }),
        selectField("role", ["user", "admin"], { required: true }),
      ],
      indexes: [],
    },
    {
      name: "courts",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: adminOnly,
      updateRule: adminOnly,
      deleteRule: adminOnly,
      fields: [
        textField("name", { required: true, max: 80 }),
        boolField("active", { required: true }),
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_courts_name` ON `courts` (`name`)"],
    },
    {
      name: "club_settings",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: adminOnly,
      updateRule: adminOnly,
      deleteRule: adminOnly,
      fields: [
        textField("key", { required: true, max: 40 }),
        jsonField("openingHours", { required: true }),
        numberField("basePrice", { required: true }),
        numberField("depositAmount", { required: true }),
        numberField("paymentHoldMinutes", { required: true, onlyInt: true }),
        numberField("cancellationCutoffHours", { required: true, onlyInt: true }),
        fileField("logo"),
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_club_settings_key` ON `club_settings` (`key`)",
      ],
    },
    {
      name: "promotions",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: adminOnly,
      updateRule: adminOnly,
      deleteRule: adminOnly,
      fields: [
        textField("name", { required: true, max: 120 }),
        boolField("active", { required: true }),
        dateField("startsAt", { required: true }),
        dateField("endsAt", { required: true }),
        jsonField("daysOfWeek", { required: true }),
        jsonField("timeRange"),
        numberField("priceOverride"),
        numberField("depositOverride"),
      ],
      indexes: [
        "CREATE INDEX `idx_promotions_active_dates` ON `promotions` (`active`, `startsAt`, `endsAt`)",
      ],
    },
    {
      name: "court_blocks",
      type: "base",
      listRule: authedOnly,
      viewRule: authedOnly,
      createRule: adminOnly,
      updateRule: adminOnly,
      deleteRule: adminOnly,
      fields: [
        relationField("courtId", ids.courts, { required: true }),
        dateField("startsAt", { required: true }),
        dateField("endsAt", { required: true }),
        textField("reason", { max: 240 }),
        relationField("createdBy", ids.users, { required: true }),
      ],
      indexes: [
        "CREATE INDEX `idx_court_blocks_court_dates` ON `court_blocks` (`courtId`, `startsAt`, `endsAt`)",
      ],
    },
    {
      name: "reservations",
      type: "base",
      listRule: ownerOrAdmin,
      viewRule: ownerOrAdmin,
      createRule: authedOnly,
      updateRule: ownerOrAdmin,
      deleteRule: adminOnly,
      fields: [
        relationField("userId", ids.users, { required: true }),
        relationField("courtId", ids.courts, { required: true }),
        textField("reservationDate", { max: 10 }),
        dateField("startsAt", { required: true }),
        dateField("endsAt", { required: true }),
        selectField("durationMinutes", reservationDurationValues, {
          required: true,
        }),
        selectField(
          "status",
          [
            "pending_payment",
            "confirmed",
            "expired",
            "cancelled_by_user",
            "cancelled_by_admin",
            "completed",
            "no_show",
          ],
          { required: true },
        ),
        numberField("totalPrice", { required: true }),
        numberField("depositAmount", { required: true }),
        dateField("expiresAt"),
      ],
      indexes: [
        "CREATE INDEX `idx_reservations_court_dates` ON `reservations` (`courtId`, `startsAt`, `endsAt`)",
        "CREATE INDEX `idx_reservations_user_status` ON `reservations` (`userId`, `status`)",
      ],
    },
    {
      name: "payments",
      type: "base",
      listRule: `${adminOnly} || reservationId.userId = @request.auth.id`,
      viewRule: `${adminOnly} || reservationId.userId = @request.auth.id`,
      createRule: adminOnly,
      updateRule: adminOnly,
      deleteRule: adminOnly,
      fields: [
        relationField("reservationId", ids.reservations, { required: true }),
        selectField("provider", ["mercadopago"], { required: true }),
        textField("providerPreferenceId", { max: 180 }),
        textField("providerPaymentId", { max: 180 }),
        selectField(
          "status",
          [
            "pending",
            "approved",
            "rejected",
            "cancelled",
            "refunded",
            "review_required",
          ],
          { required: true },
        ),
        numberField("amount", { required: true }),
        jsonField("rawWebhookData"),
      ],
      indexes: [
        "CREATE INDEX `idx_payments_reservation` ON `payments` (`reservationId`)",
        "CREATE UNIQUE INDEX `idx_payments_provider_payment` ON `payments` (`providerPaymentId`) WHERE `providerPaymentId` != ''",
      ],
    },
  ];
}

const auth = await authenticate();
const token = auth.token;

console.log("connected to PocketBase");

const firstPassNames = ["users", "courts", "club_settings", "promotions"];
const firstPassDefinitions = buildDefinitions();

for (const definition of firstPassDefinitions.filter((item) =>
  firstPassNames.includes(item.name),
)) {
  await upsertCollection(token, definition);
}

const users = await getCollection(token, "users");
const courts = await getCollection(token, "courts");

const secondPassDefinitions = buildDefinitions({
  users: users.id,
  courts: courts.id,
});

for (const name of ["court_blocks", "reservations"]) {
  await upsertCollection(
    token,
    secondPassDefinitions.find((definition) => definition.name === name),
  );
}

const reservations = await getCollection(token, "reservations");
const finalDefinitions = buildDefinitions({
  users: users.id,
  courts: courts.id,
  reservations: reservations.id,
});

await upsertCollection(
  token,
  finalDefinitions.find((definition) => definition.name === "payments"),
);

console.log("PocketBase schema sync complete");

