HAMAPARE v24 - Cloudflare Pages Functions + D1

Deploy using Wrangler CLI from this directory (dashboard drag-and-drop does not support deploying Functions):
  npx wrangler login
  npx wrangler pages deploy . --project-name hamaparesong --branch main

Before deployment, ensure Pages project Settings > Bindings has D1 database binding variable DB to hamapare-responses, Production. D1 table responses must exist.

The /api/responses endpoint is write-only. Admin access is NOT implemented. Add abuse protection (Turnstile / rate limiting), a privacy notice and retention policy before broad public distribution.

Test a single dummy response and verify it appears in D1 Console.
