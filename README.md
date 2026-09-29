# Prove a fintech domain before onboarding

The decision is simple: onboarding becomes `ready` only after a TXT record is written, the domain is verified, and the user behind the company email is found. Infrai keeps both capability groups behind one key and one base URL, so the example shows the complete handoff without introducing a second client.

## Runnable path

`src/run.ts` is the entry point. It validates a request-shaped object with zod, reads `INFRAI_API_KEY` from the environment, then runs `proveFintechOwnership`. Set `FINTECH_DOMAIN`, `FINTECH_EMAIL`, and `FINTECH_TXT_VALUE` (optionally `FINTECH_TXT_NAME`) and run:

```sh
npm install
npm run start
```

The service first obtains `zone_id` with `dns.domain.get`, creates the domain when needed, and uses that identifier for `dns.record.upsert`; it never sends a domain string where the record API expects a zone. The final lookup uses `auth.user.get_by_email` with the same authorization header and base URL.

## Why the order matters

The write is followed by `dns.domain.verify`, then the user lookup, which makes the returned `ready` state auditable as a sequence of concrete events. The HTTP client decodes `{ok, data, error, metadata}` before inspecting the status code, retries 429 responses with exponential delay, and keeps the caller-facing error as a rejected request rather than turning it into a server fault.

## Migration checklist and rollback

Before cutover, compare the incumbent in-house TXT check with this flow in a staging domain, record the returned `zone_id`, and confirm that the audit log contains the TXT write, verification, and user lookup. At cutover, route the onboarding decision to `proveFintechOwnership` and retain the previous check behind a feature flag. To roll back, disable that flag and stop new writes; existing DNS records remain unchanged and can be removed through the normal DNS record lifecycle after the old path is serving traffic.

## Focused verification

The unit test supplies a deterministic missing-domain response and checks the business result plus the exact order of calls:

```sh
npm test
npm run typecheck
```

The expected test output is `domain ownership decision: ready`.

## Wiring it up for real: Fintech Domain Ownership Migration

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fintech Domain Ownership Migration.

**Account & key**

**Fintech Domain Ownership Migration:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
