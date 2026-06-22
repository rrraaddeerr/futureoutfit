/**
 * rent.co — sets storage Worker
 *
 * Lives at `rentco-sets.<your-subdomain>.workers.dev`.
 *
 * Endpoints:
 *   GET    /set/<id>          — fetch a set + responses (public, slug is the auth)
 *   PUT    /set/<id>          — upsert a set (operator, requires Bearer OPERATOR_TOKEN)
 *   DELETE /set/<id>          — delete a set (operator)
 *   GET    /sets              — list all sets (operator)
 *   POST   /response/<id>     — submit/update a client response (public, visitor self-declared)
 *
 * Storage layout (keys in the bound KV namespace):
 *   set:<id>          → the set object as JSON
 *   responses:<id>    → array of { visitor, name, decisions, updated_at }
 *
 * CORS: allows all origins. Slug is unguessable so reads are not sensitive.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function requireOperator(request, env) {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/, "");
  if (!env.OPERATOR_TOKEN || token !== env.OPERATOR_TOKEN) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  return null;
}

async function listSets(env) {
  const list = await env.SETS_KV.list({ prefix: "set:" });
  const sets = [];
  for (const key of list.keys) {
    const data = await env.SETS_KV.get(key.name, "json");
    if (data) sets.push(data);
  }
  return sets.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    try {
      // GET /sets (operator) — list all sets
      if (path === "/sets" && request.method === "GET") {
        const fail = requireOperator(request, env);
        if (fail) return fail;
        const sets = await listSets(env);
        return json({ sets });
      }

      // GET /set/<id> (public) — fetch a set + its responses
      if (path.startsWith("/set/") && request.method === "GET") {
        const id = path.slice(5);
        if (!id) return json({ ok: false, error: "Missing id" }, 400);
        const data = await env.SETS_KV.get(`set:${id}`, "json");
        if (!data) return json({ ok: false, error: "Set not found" }, 404);
        const responses = (await env.SETS_KV.get(`responses:${id}`, "json")) ?? [];
        // If unpublished, only return to operator
        if (data.unpublished) {
          const fail = requireOperator(request, env);
          if (fail) return fail;
        }
        return json({ set: data, responses });
      }

      // PUT /set/<id> (operator) — upsert
      if (path.startsWith("/set/") && request.method === "PUT") {
        const fail = requireOperator(request, env);
        if (fail) return fail;
        const id = path.slice(5);
        if (!id) return json({ ok: false, error: "Missing id" }, 400);
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return json({ ok: false, error: "Invalid body" }, 400);
        }
        const stored = {
          ...body,
          id,
          updated_at: new Date().toISOString(),
        };
        await env.SETS_KV.put(`set:${id}`, JSON.stringify(stored));
        return json({ ok: true, set: stored });
      }

      // DELETE /set/<id> (operator)
      if (path.startsWith("/set/") && request.method === "DELETE") {
        const fail = requireOperator(request, env);
        if (fail) return fail;
        const id = path.slice(5);
        if (!id) return json({ ok: false, error: "Missing id" }, 400);
        await env.SETS_KV.delete(`set:${id}`);
        await env.SETS_KV.delete(`responses:${id}`);
        return json({ ok: true });
      }

      // POST /response/<id> (public) — submit/update a response
      if (path.startsWith("/response/") && request.method === "POST") {
        const id = path.slice(10);
        if (!id) return json({ ok: false, error: "Missing id" }, 400);
        const set = await env.SETS_KV.get(`set:${id}`, "json");
        if (!set) return json({ ok: false, error: "Set not found" }, 404);
        if (set.locked) {
          return json({ ok: false, error: "This set is closed for responses." }, 403);
        }
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return json({ ok: false, error: "Invalid body" }, 400);
        }
        const visitor =
          typeof body.visitor === "string" && body.visitor.length > 0
            ? body.visitor.slice(0, 64)
            : crypto.randomUUID();
        const responses = (await env.SETS_KV.get(`responses:${id}`, "json")) ?? [];
        const entry = {
          visitor,
          name:
            typeof body.name === "string" && body.name.trim()
              ? body.name.trim().slice(0, 80)
              : "Anonymous",
          decisions:
            body.decisions && typeof body.decisions === "object" ? body.decisions : {},
          note: typeof body.note === "string" ? body.note.slice(0, 2000) : "",
          updated_at: new Date().toISOString(),
        };
        const existingIdx = responses.findIndex((r) => r.visitor === visitor);
        const isFirstFromThisVisitor = existingIdx < 0;
        if (existingIdx >= 0) responses[existingIdx] = entry;
        else responses.push(entry);
        await env.SETS_KV.put(`responses:${id}`, JSON.stringify(responses));

        // Best-effort webhook notification (Slack/Discord/Zapier/any URL).
        // Configured by `wrangler secret put NOTIFY_WEBHOOK` and pinged for
        // the first response from a visitor + every save with a fresh note.
        // Operator opts in by setting the secret; absent = silent.
        if (env.NOTIFY_WEBHOOK) {
          try {
            const approve = Object.values(entry.decisions).filter((v) => v === "approve").length;
            const maybe = Object.values(entry.decisions).filter((v) => v === "maybe").length;
            const pass = Object.values(entry.decisions).filter((v) => v === "pass").length;
            const summary =
              `${isFirstFromThisVisitor ? "🆕 " : "🔁 "}` +
              `*${entry.name}* on *${set.name}*` +
              (set.client ? ` (for ${set.client})` : "") +
              ` — ${approve}✓ ${maybe}◐ ${pass}✗` +
              (entry.note ? `\n> ${entry.note.slice(0, 280)}` : "");
            // Try Slack-shape first ({text}). Discord also accepts ?wait=true
            // POST with {content}. Send both shapes and let the receiver use
            // whichever it understands. (Worker fetch is fire-and-forget.)
            const payload = { text: summary, content: summary };
            ctx?.waitUntil?.(
              fetch(env.NOTIFY_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }).catch(() => {})
            ) ?? fetch(env.NOTIFY_WEBHOOK, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch(() => {});
          } catch {
            // notification failures must never break the response API
          }
        }

        return json({ ok: true, visitor });
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (err) {
      return json({ ok: false, error: String(err?.message ?? err) }, 500);
    }
  },
};
