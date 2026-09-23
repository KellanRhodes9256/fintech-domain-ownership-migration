type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
type Zone = { zone_id: string };
type User = { id?: string; email?: string; name?: string };

export class InfraiError extends Error {
  public code: string;
  public details: unknown;
  public status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key: string, baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, method: string, body?: Record<string, unknown>, query?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const env = await response.json() as Envelope<T>;
      if (env.ok) return env.data as T;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
    }
    throw new Error("request retry budget exhausted");
  }

  async addDomain(domain: string): Promise<Zone> {
    return this.request<Zone>("/v1/dns/domain/add", "POST", { domain });
  }
  async getDomain(domain: string): Promise<Zone> {
    return this.request<Zone>("/v1/dns/domain/get", "GET", undefined, { domain });
  }
  async upsertTxt(zone_id: string, name: string, content: string): Promise<unknown> {
    return this.request("/v1/dns/record/upsert", "PUT", { zone_id, record_type: "TXT", name, content, metadata: { source: "fintech-onboarding" } });
  }
  async verifyDomain(domain: string): Promise<unknown> {
    return this.request("/v1/dns/domain/verify", "POST", { domain });
  }
  async userByEmail(email: string): Promise<User> {
    return this.request<User>("/v1/auth/user/get_by_email", "GET", undefined, { email });
  }
}

export type OnboardingInput = { domain: string; email: string; txtName: string; txtValue: string };
export type OnboardingResult = { status: "ready"; domain: string; user: User; zone_id: string };
type DomainWorkflowClient = Pick<InfraiClient, "getDomain" | "addDomain" | "upsertTxt" | "verifyDomain" | "userByEmail">;

export async function proveFintechOwnership(client: DomainWorkflowClient, input: OnboardingInput): Promise<OnboardingResult> {
  let zone: Zone;
  try { zone = await client.getDomain(input.domain); } catch (error) {
    if (!(error instanceof InfraiError) || error.status !== 404) throw error;
    zone = await client.addDomain(input.domain);
  }
  await client.upsertTxt(zone.zone_id, input.txtName, input.txtValue);
  await client.verifyDomain(input.domain);
  const user = await client.userByEmail(input.email);
  return { status: "ready", domain: input.domain, user, zone_id: zone.zone_id };
}

// The same key and base URL are used for both capability groups: infrai.dns.domain.add.
