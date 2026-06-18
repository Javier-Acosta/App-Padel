import { getServerEnv } from "@/lib/env";

type PocketBaseAuthResponse = {
  token: string;
  admin?: unknown;
  record?: unknown;
};

type PocketBaseListResponse<T> = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
};

type PocketBaseRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  cache?: RequestCache;
};

function buildPocketBaseUrl(
  path: string,
  searchParams?: PocketBaseRequestOptions["searchParams"],
) {
  const { POCKETBASE_URL } = getServerEnv();
  const url = new URL(path, POCKETBASE_URL);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

export async function pocketBaseRequest<T>(
  path: string,
  options: PocketBaseRequestOptions = {},
) {
  const response = await fetch(buildPocketBaseUrl(path, options.searchParams), {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PocketBase request failed (${response.status}): ${errorText}`,
    );
  }

  return (await response.json()) as T;
}

export async function authenticatePocketBaseAdmin() {
  const { POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD } = getServerEnv();

  return pocketBaseRequest<PocketBaseAuthResponse>(
    "/api/admins/auth-with-password",
    {
      method: "POST",
      body: {
        identity: POCKETBASE_ADMIN_EMAIL,
        password: POCKETBASE_ADMIN_PASSWORD,
      },
    },
  );
}

export async function listPocketBaseRecords<T>(
  collection: string,
  options: Omit<PocketBaseRequestOptions, "method" | "body"> = {},
) {
  return pocketBaseRequest<PocketBaseListResponse<T>>(
    `/api/collections/${collection}/records`,
    options,
  );
}

export async function createPocketBaseRecord<T>(
  collection: string,
  body: unknown,
  options: Omit<PocketBaseRequestOptions, "method" | "body"> = {},
) {
  return pocketBaseRequest<T>(`/api/collections/${collection}/records`, {
    ...options,
    method: "POST",
    body,
  });
}

export async function authenticatePocketBaseUser<T>(
  identity: string,
  password: string,
) {
  return pocketBaseRequest<{ token: string; record: T }>(
    "/api/collections/users/auth-with-password",
    {
      method: "POST",
      body: {
        identity,
        password,
      },
    },
  );
}

export async function refreshPocketBaseUserAuth<T>(token: string) {
  return pocketBaseRequest<{ token: string; record: T }>(
    "/api/collections/users/auth-refresh",
    {
      method: "POST",
      token,
    },
  );
}
