export type ProviderV2Service = {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean;
  cancel?: boolean;
};

export type ProviderV2AddOrderResponse =
  | { order: number }
  | { error: string }
  | Record<string, unknown>;

export type ProviderV2OrderStatusResponse =
  | {
      charge?: string;
      start_count?: string;
      status?: string;
      remains?: string;
      currency?: string;
      error?: string;
    }
  | Record<string, unknown>;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

async function postForm(baseUrl: string, form: Record<string, string>) {
  const url = `${normalizeBaseUrl(baseUrl)}/api/v2`;
  const body = new URLSearchParams(form);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Provider API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return (await res.json()) as unknown;
}

export function getProviderApiKey() {
  // IMPORTANT: do not commit this value; set in .env.local
  // Example: SMM_PROVIDER_API_KEY="..."
  return requireEnv("SMM_PROVIDER_API_KEY");
}

export async function providerV2ListServices(input: { baseUrl: string; apiKey?: string }) {
  const key = input.apiKey ?? getProviderApiKey();
  const raw = await postForm(input.baseUrl, { key, action: "services" });
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "error" in raw) {
    throw new Error(`Provider services error: ${String((raw as { error?: unknown }).error)}`);
  }
  if (!Array.isArray(raw)) throw new Error("Unexpected provider services response");
  return raw as ProviderV2Service[];
}

export async function providerV2Balance(input: { baseUrl: string; apiKey?: string }) {
  const key = input.apiKey ?? getProviderApiKey();
  const raw = await postForm(input.baseUrl, { key, action: "balance" });
  return raw as { balance?: string; currency?: string; error?: string };
}

export async function providerV2AddOrder(input: {
  baseUrl: string;
  service: number;
  link: string;
  quantity: number;
  apiKey?: string;
}) {
  const key = input.apiKey ?? getProviderApiKey();
  const raw = await postForm(input.baseUrl, {
    key,
    action: "add",
    service: String(input.service),
    link: input.link,
    quantity: String(input.quantity),
  });
  return raw as ProviderV2AddOrderResponse;
}

export async function providerV2OrderStatus(input: {
  baseUrl: string;
  order: number;
  apiKey?: string;
}) {
  const key = input.apiKey ?? getProviderApiKey();
  const raw = await postForm(input.baseUrl, {
    key,
    action: "status",
    order: String(input.order),
  });
  return raw as ProviderV2OrderStatusResponse;
}

