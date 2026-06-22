# rentco-sets worker

Cloudflare Worker for rent.co's client-facing presentation sets.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/sets` | operator | list all sets |
| GET | `/set/<id>` | public | fetch a set + its responses |
| PUT | `/set/<id>` | operator | upsert a set |
| DELETE | `/set/<id>` | operator | delete a set + its responses |
| POST | `/response/<id>` | public | submit/update a client response |

Operator endpoints require `Authorization: Bearer <OPERATOR_TOKEN>`.

## One-time setup

```bash
cd worker/rentco-sets
npm install
npx wrangler login                          # authenticates wrangler with Cloudflare
npx wrangler kv namespace create rentco-sets-kv   # creates the KV, prints an id
# Paste the printed id into wrangler.toml under [[kv_namespaces]] id = "..."

# Make a random token for operator endpoints:
openssl rand -hex 32                         # copy the output
npx wrangler secret put OPERATOR_TOKEN       # paste it when prompted
```

## Deploy

```bash
npm run deploy
```

The worker lands at `https://rentco-sets.<your-subdomain>.workers.dev`. Save
that URL — it goes in rent.co's env vars as `RENTCO_SETS_URL`, alongside
`RENTCO_SETS_TOKEN` (the same value you put as the OPERATOR_TOKEN secret).

## Iterate

## Notifications (optional)

Get pinged when a client responds — Slack, Discord, Zapier, or any
generic webhook URL works:

```bash
npx wrangler secret put NOTIFY_WEBHOOK
# paste your webhook URL when prompted
npx wrangler deploy
```

The worker POSTs both `{text}` (Slack) and `{content}` (Discord) shapes
so most receivers Just Work. Disable by deleting the secret.

## Iterate

`npm run dev` runs the worker locally with hot reload. Test with:

```bash
curl -X PUT https://localhost:8787/set/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hello"}'
```
