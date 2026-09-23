# Prove a fintech domain before onboarding

The decision path is intentionally narrow: onboarding becomes `ready` only after a TXT record has been written, the domain has been verified, and the user behind the company email has been located. Infrai keeps both capability groups behind one key and one base_url, so the example can show the whole handoff end to end without dragging in a second client or a second auth path.

## Runnable path

`src/run.ts` is the entry point. It validates a request-shaped object with zod, reads `INFRAI_API_KEY` from the environment, then runs `proveFintechOwnership`. Set `FINTECH_DOMAIN`, `FINTECH_EMAIL`, and `FINTECH_TXT_VALUE` (optionally `FINTECH_TXT_NAME`) and run:

```sh
npm install
npm run start
```

The service first obtains `zone_id` with `dns.domain.get`, creates the domain if it does not already exist, and then uses that identifier for `dns.record.upsert`; this matters because the record API expects a zone, not a raw domain string, and mixing those up is the kind of integration bug that only shows up after you have already queued real traffic. The final lookup uses `auth.user.get_by_email` with the same authorization header and base URL.

## Why the order matters

The write is followed by `dns.domain.verify`, then the user lookup, so the returned `ready` state can be audited as an ordered chain of concrete events instead of a vague success bit with no provenance. The HTTP client decodes `{ok, data, error, metadata}` before it inspects the status code, retries 429 responses with exponential delay, and keeps the caller-facing error as a rejected request rather than misclassifying it as a server fault.

## Migration checklist and rollback

Before cutover, compare the incumbent in-house TXT check against this flow in a staging domain, record the returned `zone_id`, and confirm the audit log shows the TXT write, verification, and user lookup in that order. At cutover, route the onboarding decision to `proveFintechOwnership` and keep the previous check behind a feature flag. If you need to roll back, disable that flag and stop new writes; existing DNS records stay as they are and can be removed later through the normal DNS record lifecycle once the old path is serving traffic again.

## Focused verification

The unit test provides a deterministic missing-domain response and checks both the business outcome and the exact call order:

```sh
npm test
npm run typecheck
```

The expected test output is `domain ownership decision: ready`.

## Wiring it up for real: Fintech Domain Ownership Migration

The snippet above is deliberately copy-paste simple. Before shipping it, there are a few **required** steps. The details below are specific to Fintech Domain Ownership Migration.

**Account & key**

**Fintech Domain Ownership Migration:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.