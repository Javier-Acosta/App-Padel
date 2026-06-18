const serverEnvKeys = [
  "POCKETBASE_URL",
  "POCKETBASE_ADMIN_EMAIL",
  "POCKETBASE_ADMIN_PASSWORD",
] as const;

export type ServerEnv = Record<(typeof serverEnvKeys)[number], string>;

export function getServerEnv(): ServerEnv {
  const missing = serverEnvKeys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    POCKETBASE_URL: process.env.POCKETBASE_URL!,
    POCKETBASE_ADMIN_EMAIL: process.env.POCKETBASE_ADMIN_EMAIL!,
    POCKETBASE_ADMIN_PASSWORD: process.env.POCKETBASE_ADMIN_PASSWORD!,
  };
}

