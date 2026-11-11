const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return reply({ error: "Database unavailable" }, 503);
  }

  // Cloudflare Accessの認証設定が必須
  const token = request.headers.get("Cf-Access-Jwt-Assertion");

  if (!token || !env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) {
    return reply({ error: "Authentication required" }, 403);
  }

  try {
    const jwksUrl =
      `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;

    const jwksResponse = await fetch(jwksUrl);
    if (!jwksResponse.ok) {
      return reply({ error: "Authentication unavailable" }, 503);
    }

    const { keys } = await jwksResponse.json();
    const parts = token.split(".");
    if (parts.length !== 3) {
      return reply({ error: "Invalid token" }, 403);
    }

    const decode = (part) => {
      const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(
        atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
        c => c.charCodeAt(0)
      );
      return JSON.parse(new TextDecoder().decode(bytes));
    };

    const header = decode(parts[0]);
    const payload = decode(parts[1]);

    if (header.alg !== "RS256") {
      return reply({ error: "Invalid algorithm" }, 403);
    }

    const key = keys.find(k =>
      k.kid === header.kid && k.kty === "RSA"
    );

    if (!key) {
      return reply({ error: "Invalid signing key" }, 403);
    }

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(parts[2].length / 4) * 4, "=")),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );

    const now = Math.floor(Date.now() / 1000);
    const audience = Array.isArray(payload.aud)
      ? payload.aud
      : [payload.aud];

    if (
      !valid ||
      !audience.includes(env.ACCESS_AUD) ||
      payload.iss !==
        `https://${env.ACCESS_TEAM_DOMAIN}` ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now ||
      !Number.isFinite(payload.nbf) ||
      payload.nbf > now
    ) {
      return reply({ error: "Access denied" }, 403);
    }

    const result = await env.DB.prepare(
      `SELECT id, name, age, submitted_at, answers_json
       FROM responses
       ORDER BY id DESC
       LIMIT 1000`
    ).all();

    return reply({
      ok: true,
      total: result.results.length,
      responses: result.results.map(row => ({
        id: row.id,
        name: row.name,
        age: row.age,
        submitted_at: row.submitted_at,
        answers: JSON.parse(row.answers_json)
      }))
    });

  } catch {
    return reply({ error: "Request failed" }, 503);
  }
}

export function onRequestPost() {
  return reply({ error: "Method not allowed" }, 405);
}
