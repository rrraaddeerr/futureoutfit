# fo-sync — Future Outfit cloud save

Tiny Cloudflare Worker that makes the kids app's data **real**: a profile's
closet, saved looks, and Supporter Stars live in the cloud and follow the kid
to any device.

**Kid-safe by design:** no emails, no passwords, no personal data. An account is
just an unguessable friendly **code** (e.g. `brave-otter-42`) that is both the
read and write key. Nothing sensitive is stored — only style prefs.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| POST | `/profile` | create a profile → `{ code }` |
| GET | `/state/:code` | read saved state |
| PUT | `/state/:code` | save state (`{ data: {...} }`) |

The app talks to `https://fo-sync.<subdomain>.workers.dev` (already wired in
`future-outfit/index.html` as `SYNC_URL`). Until it's deployed, the app just
runs locally — cloud is opt-in (the kid taps "Turn on cloud save").

## Deploy (3 commands — no secret/token needed)

```bash
cd worker/fo-sync
npx wrangler kv namespace create fo-sync-kv     # prints an id …
#   … paste it into wrangler.toml:  id = "THE_ID"
npx wrangler deploy
```

That's it. The app will start syncing as soon as a kid turns on cloud save.

## Test

```bash
npm test     # 15 logic tests (Map-backed KV, no network)
```
