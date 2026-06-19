#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const serverVersion = "0.1.0";
const serverName = "mcp-app-padel";
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, "..");

const tools = [
  {
    name: "app_context",
    description:
      "Return high-level context for the AppPadel project and its MVP scope.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "openspec_change",
    description:
      "Read OpenSpec change artifacts for the court reservation MVP.",
    inputSchema: {
      type: "object",
      properties: {
        artifact: {
          type: "string",
          enum: [
            "proposal",
            "design",
            "tasks",
            "court-reservations",
            "payments",
            "admin-operations",
          ],
        },
      },
      required: ["artifact"],
      additionalProperties: false,
    },
  },
  {
    name: "env_keys",
    description:
      "Return the expected environment variable names without exposing values.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

const artifactPaths = {
  proposal:
    "openspec/changes/add-court-reservation-mvp/proposal.md",
  design: "openspec/changes/add-court-reservation-mvp/design.md",
  tasks: "openspec/changes/add-court-reservation-mvp/tasks.md",
  "court-reservations":
    "openspec/changes/add-court-reservation-mvp/specs/court-reservations/spec.md",
  payments:
    "openspec/changes/add-court-reservation-mvp/specs/payments/spec.md",
  "admin-operations":
    "openspec/changes/add-court-reservation-mvp/specs/admin-operations/spec.md",
};

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id, payload) {
  send({
    jsonrpc: "2.0",
    id,
    result: payload,
  });
}

function error(id, code, message) {
  send({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

async function readRepoFile(relativePath) {
  const target = path.resolve(repoRoot, relativePath);

  if (!target.startsWith(repoRoot)) {
    throw new Error("Refusing to read outside the AppPadel repository.");
  }

  return readFile(target, "utf8");
}

async function callTool(name, args = {}) {
  if (name === "app_context") {
    return {
      content: [
        {
          type: "text",
          text: [
            "AppPadel is a Next.js app for a single padel club.",
            "",
            "Current MVP scope:",
            "- Registered users reserve court turns from a calendar.",
            "- Supported turn durations start at 60 minutes and can grow in 30-minute increments.",
            "- Reservations require a non-refundable MercadoPago deposit.",
            "- Payment approval confirms reservations automatically.",
            "- Users can cancel up to 3 hours before the turn.",
            "- Admins manage courts, hours, pricing, deposits, promotions, blocks, and reservations.",
          ].join("\n"),
        },
      ],
    };
  }

  if (name === "openspec_change") {
    const artifactPath = artifactPaths[args.artifact];

    if (!artifactPath) {
      throw new Error(`Unknown artifact: ${args.artifact}`);
    }

    const text = await readRepoFile(artifactPath);

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }

  if (name === "env_keys") {
    return {
      content: [
        {
          type: "text",
          text: [
            "Expected .env.local keys:",
            "- POCKETBASE_URL",
            "- POCKETBASE_ADMIN_EMAIL",
            "- POCKETBASE_ADMIN_PASSWORD",
          ].join("\n"),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handle(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    result(id, {
      protocolVersion: params?.protocolVersion ?? "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: serverName,
        version: serverVersion,
      },
    });
    return;
  }

  if (method === "tools/list") {
    result(id, { tools });
    return;
  }

  if (method === "tools/call") {
    try {
      result(
        id,
        await callTool(params?.name, params?.arguments ?? {}),
      );
    } catch (toolError) {
      result(id, {
        isError: true,
        content: [
          {
            type: "text",
            text:
              toolError instanceof Error
                ? toolError.message
                : "Unknown tool error",
          },
        ],
      });
    }
    return;
  }

  if (id !== undefined) {
    error(id, -32601, `Method not found: ${method}`);
  }
}

const input = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

input.on("line", async (line) => {
  if (!line.trim()) {
    return;
  }

  try {
    await handle(JSON.parse(line));
  } catch (parseError) {
    error(
      null,
      -32700,
      parseError instanceof Error ? parseError.message : "Parse error",
    );
  }
});

