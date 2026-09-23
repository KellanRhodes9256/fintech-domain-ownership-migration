import { z } from "zod";
import { InfraiClient, proveFintechOwnership } from "./fintech_domain.ts";

const Body = z.object({ domain: z.string().min(1), email: z.string().email(), txtName: z.string().min(1), txtValue: z.string().min(1) });
const input = Body.parse({ domain: process.env.FINTECH_DOMAIN, email: process.env.FINTECH_EMAIL, txtName: process.env.FINTECH_TXT_NAME ?? "_infrai", txtValue: process.env.FINTECH_TXT_VALUE });
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");
const result = await proveFintechOwnership(new InfraiClient(key), input);
console.log(JSON.stringify(result, null, 2));
