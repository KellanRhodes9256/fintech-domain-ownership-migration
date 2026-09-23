import assert from "node:assert/strict";
import { InfraiError, proveFintechOwnership } from "./fintech_domain.ts";

const calls: string[] = [];
const fake = {
  async getDomain(domain: string) { calls.push(`get:${domain}`); throw new InfraiError("DOMAIN_NOT_FOUND", { code: "DOMAIN_NOT_FOUND" }, 404); },
  async addDomain(domain: string) { calls.push(`add:${domain}`); return { zone_id: "zone_test" }; },
  async upsertTxt(zone_id: string, name: string, content: string) { calls.push(`txt:${zone_id}:${name}:${content}`); },
  async verifyDomain(domain: string) { calls.push(`verify:${domain}`); },
  async userByEmail(email: string) { calls.push(`user:${email}`); return { id: "u1", email }; }
};
const result = await proveFintechOwnership(fake, { domain: "pay.example", email: "owner@pay.example", txtName: "_infrai", txtValue: "verify-123" });
assert.deepEqual(result, { status: "ready", domain: "pay.example", user: { id: "u1", email: "owner@pay.example" }, zone_id: "zone_test" });
assert.deepEqual(calls, ["get:pay.example", "add:pay.example", "txt:zone_test:_infrai:verify-123", "verify:pay.example", "user:owner@pay.example"]);
console.log("domain ownership decision: ready");
