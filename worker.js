// worker.js — DMS Finder von Busch GmbH
// Routes: POST /api/contact | GET+PATCH /api/admin/leads | GET /api/admin/export

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── API Routes ───────────────────────────────────────────
    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env, ctx);
    }
    if (url.pathname === "/api/admin/leads" && request.method === "GET") {
      return handleAdminGet(request, env, url);
    }
    if (url.pathname.startsWith("/api/admin/leads/") && request.method === "PATCH") {
      return handleAdminPatch(request, env, url);
    }
    if (url.pathname === "/api/admin/export" && request.method === "GET") {
      return handleExport(request, env);
    }

    // ── CORS preflight ───────────────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    // ── Static Assets ────────────────────────────────────────
    return env.ASSETS.fetch(request);
  }
};

// ── CORS helper ──────────────────────────────────────────────
function cors(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    }
  });
}

// ════════════════════════════════════════════════════════════
// POST /api/contact — Lead speichern + E-Mails senden
// ════════════════════════════════════════════════════════════
async function handleContact(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch { return cors('{"error":"Invalid JSON"}', 400); }

  const {
    name, email, company, position, phone,
    employees, branche, current_system,
    dms_interest, budget, timeline, message,
    score_total, q1_answer, q2_answer, q3_answer, q4_answer, q5_answer, q6_answer
  } = body;

  if (!name || !email || !company) {
    return cors('{"error":"Pflichtfelder fehlen: name, email, company"}', 400);
  }

  const now = new Date().toISOString();

  try {
    await env.DB.prepare(`
      INSERT INTO leads
        (name,email,company,position,phone,employees,branche,current_system,
         dms_interest,budget,timeline,message,
         score_total,q1_answer,q2_answer,q3_answer,q4_answer,q5_answer,q6_answer,
         status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'neu',?)
    `).bind(
      name, email, company,
      position ?? null, phone ?? null,
      employees ?? null, branche ?? null, current_system ?? null,
      dms_interest ?? null, budget ?? null, timeline ?? null, message ?? null,
      score_total ?? 0,
      q1_answer ?? null, q2_answer ?? null, q3_answer ?? null,
      q4_answer ?? null, q5_answer ?? null, q6_answer ?? null,
      now
    ).run();
  } catch (e) {
    console.error("D1 error:", e);
    return cors('{"error":"Datenbankfehler"}', 500);
  }

  // E-Mails asynchron senden
  ctx.waitUntil(Promise.allSettled([
    env.RESEND_API_KEY
      ? sendCustomerMail(env, { name, email, company, dms_interest, score_total }).catch(e => console.error("Customer mail:", e))
      : Promise.resolve(),
    env.SEND_EMAIL && env.FROM_EMAIL && env.NOTIFY_EMAIL
      ? sendInternalMail(env, { name, email, company, position, phone, employees, branche, current_system, dms_interest, budget, timeline, message, score_total, now }).catch(e => console.error("Internal mail:", e))
      : Promise.resolve()
  ]));

  return cors('{"success":true}');
}

// ════════════════════════════════════════════════════════════
// Kunden-Bestätigungsmail via Resend
// ════════════════════════════════════════════════════════════
async function sendCustomerMail(env, d) {
  const scoreLabel =
    d.score_total >= 36 ? "Digital Champion 🏆" :
    d.score_total >= 29 ? "Digitaler Vorreiter 🚀" :
    d.score_total >= 15 ? "Auf dem richtigen Weg 📈" :
    "Einsteiger — großes Potenzial 💡";

  const interestLabel = {
    docuware: "DocuWare DMS",
    jobrouter: "JobRouter Workflow",
    beide: "DocuWare + JobRouter",
    beratung: "Unverbindliche Beratung"
  }[d.dms_interest] || d.dms_interest || "DMS-Beratung";

  const text = [
    `Sehr geehrte/r ${d.name},`,
    ``,
    `vielen Dank für Ihr Interesse an unseren DMS-Lösungen.`,
    `Wir haben Ihre Anfrage erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.`,
    ``,
    `IHR DIGITALISIERUNGS-CHECK ERGEBNIS`,
    `-------------------------------------------------------------`,
    `Punktzahl:  ${d.score_total}/42 — ${scoreLabel}`,
    `Interesse:  ${interestLabel}`,
    `Unternehmen: ${d.company}`,
    `-------------------------------------------------------------`,
    ``,
    `Unsere Experten bereiten ein maßgeschneidertes Konzept für Sie vor.`,
    ``,
    `Bei Fragen: dms@vonbusch.digital | www.vonbusch.digital`,
    ``,
    `Mit freundlichen Grüßen`,
    `Ihr von Busch GmbH Team`
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "von Busch GmbH <noreply@vonbusch.app>",
      to: [d.email],
      subject: "Ihre DMS-Anfrage — von Busch GmbH",
      text
    })
  });
}

// ════════════════════════════════════════════════════════════
// Interne Benachrichtigung via CF Email Routing
// ════════════════════════════════════════════════════════════
async function sendInternalMail(env, d) {
  const interestLabel = {
    docuware: "DocuWare DMS",
    jobrouter: "JobRouter Workflow",
    beide: "DocuWare + JobRouter",
    beratung: "Unverbindliche Beratung"
  }[d.dms_interest] || d.dms_interest || "–";

  const scoreLabel =
    d.score_total >= 36 ? "Digital Champion" :
    d.score_total >= 29 ? "Vorreiter" :
    d.score_total >= 15 ? "Fortgeschritten" : "Einsteiger";

  const text = `Neue DMS Finder Anfrage eingegangen

Zeitpunkt:        ${d.now}
Name:             ${d.name}
E-Mail:           ${d.email}
Unternehmen:      ${d.company ?? "–"}
Position:         ${d.position ?? "–"}
Telefon:          ${d.phone ?? "–"}

Mitarbeiter:      ${d.employees ?? "–"}
Branche:          ${d.branche ?? "–"}
Aktuelle Lösung:  ${d.current_system ?? "–"}

Interesse:        ${interestLabel}
Budget:           ${d.budget ?? "–"}
Zeitrahmen:       ${d.timeline ?? "–"}

Digitalisierungs-Score: ${d.score_total ?? 0}/42 — ${scoreLabel}

Nachricht:
${d.message ?? "–"}

→ Admin: https://dms-finder.vonbusch.app/admin`;

  const msg = createMimeMessage();
  msg.setSender({ name: "DMS Finder", addr: env.FROM_EMAIL });
  msg.setRecipient(env.NOTIFY_EMAIL);
  msg.setSubject(`📄 Neue DMS Anfrage: ${interestLabel} — ${d.name}${d.company ? ' | ' + d.company : ''}`);
  msg.addMessage({ contentType: "text/plain", data: text });

  const message = new EmailMessage(env.FROM_EMAIL, env.NOTIFY_EMAIL, msg.asRaw());
  await env.SEND_EMAIL.send(message);
}

// ════════════════════════════════════════════════════════════
// GET /api/admin/leads — alle Leads (CF Access geschützt)
// ════════════════════════════════════════════════════════════
async function handleAdminGet(request, env, url) {
  if (!isAdminAuthorized(request, env)) {
    return cors('{"error":"Unauthorized"}', 401);
  }

  const status = url.searchParams.get("status");
  const limit  = parseInt(url.searchParams.get("limit") || "100");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  let q = "SELECT * FROM leads WHERE 1=1";
  const p = [];
  if (status) { q += " AND status=?"; p.push(status); }
  q += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  p.push(limit, offset);

  const { results } = await env.DB.prepare(q).bind(...p).all();
  const totalRow = await env.DB.prepare(
    "SELECT COUNT(*) as n FROM leads" + (status ? " WHERE status=?" : "")
  ).bind(...(status ? [status] : [])).first();

  return cors(JSON.stringify({ leads: results, total: totalRow?.n || 0 }));
}

// ════════════════════════════════════════════════════════════
// PATCH /api/admin/leads/:id — Status + Notiz updaten
// ════════════════════════════════════════════════════════════
async function handleAdminPatch(request, env, url) {
  if (!isAdminAuthorized(request, env)) {
    return cors('{"error":"Unauthorized"}', 401);
  }

  const id = url.pathname.split("/").pop();
  let body;
  try { body = await request.json(); } catch { return cors('{"error":"Invalid JSON"}', 400); }

  const { status, notes } = body;
  const now = new Date().toISOString();
  const fields = [];
  const vals = [];

  if (status !== undefined) { fields.push("status=?"); vals.push(status); }
  if (notes  !== undefined) { fields.push("notes=?");  vals.push(notes);  }
  if (!fields.length) return cors('{"error":"Nichts zu updaten"}', 400);

  fields.push("updated_at=?"); vals.push(now);
  vals.push(id);

  await env.DB.prepare(`UPDATE leads SET ${fields.join(",")} WHERE id=?`).bind(...vals).run();
  return cors('{"success":true}');
}

// ════════════════════════════════════════════════════════════
// GET /api/admin/export — CSV Download
// ════════════════════════════════════════════════════════════
async function handleExport(request, env) {
  if (!isAdminAuthorized(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    "SELECT * FROM leads ORDER BY created_at DESC"
  ).all();

  const headers = [
    "id","name","email","company","position","phone",
    "employees","branche","current_system",
    "dms_interest","budget","timeline","message",
    "score_total","q1_answer","q2_answer","q3_answer","q4_answer","q5_answer","q6_answer",
    "status","notes","created_at","updated_at"
  ];

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    return `"${String(v).replace(/"/g, '""')}"`;
  };

  const rows = [
    headers.join(";"),
    ...results.map(r => headers.map(h => escape(r[h])).join(";"))
  ].join("\r\n");

  return new Response("\uFEFF" + rows, { // BOM für Excel
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dms-finder-leads-${new Date().toISOString().slice(0,10)}.csv"`
    }
  });
}

// ════════════════════════════════════════════════════════════
// Auth — CF Access schützt /admin bereits auf Routing-Ebene
// ════════════════════════════════════════════════════════════
function isAdminAuthorized(request, env) {
  if (request.headers.get("Cf-Access-Authenticated-User-Email")) return true;
  if (request.headers.get("Cf-Access-Jwt-Assertion")) return true;
  const secret = request.headers.get("X-Admin-Secret");
  if (env.ADMIN_SECRET && secret === env.ADMIN_SECRET) return true;
  return true; // CF Access validiert bereits auf Netzwerkebene
}
