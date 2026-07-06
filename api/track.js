const MAX = {
  eventType: 40,
  eventLabel: 120,
  path: 240,
  title: 160,
  referrer: 160,
  source: 60,
  campaign: 120,
  id: 80
};

const clean = (value, limit) => String(value || "").trim().slice(0, limit);

const decodeHeader = (value) => {
  const text = clean(value, 100);
  try { return decodeURIComponent(text); } catch { return text; }
};

const isBot = (userAgent) => /bot|crawler|spider|slurp|headless|preview|monitor|lighthouse/i.test(userAgent || "");

const isAllowedEvent = (value) => [
  "page_view",
  "cta_click",
  "phone_click",
  "qr_view",
  "article_click",
  "case_image_view"
].includes(value);

const supabaseRequest = async (path, options = {}) => fetch(`${process.env.SUPABASE_URL}${path}`, {
  ...options,
  headers: {
    "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  }
});

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({error: "Method not allowed"});
  if (isBot(req.headers["user-agent"])) return res.status(202).json({ok: true, stored: false});
  if (req.headers["sec-fetch-site"] === "cross-site") return res.status(403).json({error: "Invalid origin"});

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({error: "Invalid JSON"});
  }

  const eventType = clean(body.eventType, MAX.eventType);
  const visitorId = clean(body.visitorId, MAX.id);
  const sessionId = clean(body.sessionId, MAX.id);
  if (!isAllowedEvent(eventType) || visitorId.length < 8 || sessionId.length < 8) {
    return res.status(400).json({error: "Invalid event"});
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(202).json({ok: true, stored: false, reason: "not_configured"});
  }

  const payload = {
    visitor_id: visitorId,
    session_id: sessionId,
    event_type: eventType,
    event_label: clean(body.eventLabel, MAX.eventLabel),
    page_path: clean(body.pagePath, MAX.path) || "/",
    page_title: clean(body.pageTitle, MAX.title),
    referrer: clean(body.referrer, MAX.referrer),
    source: clean(body.source, MAX.source) || "direct",
    utm_source: clean(body.utmSource, MAX.source),
    utm_medium: clean(body.utmMedium, MAX.source),
    utm_campaign: clean(body.utmCampaign, MAX.campaign),
    country: decodeHeader(req.headers["x-vercel-ip-country"]),
    region: decodeHeader(req.headers["x-vercel-ip-country-region"]),
    city: decodeHeader(req.headers["x-vercel-ip-city"]),
    device: ["mobile", "tablet", "desktop"].includes(body.device) ? body.device : "desktop",
    metadata: {screen: clean(body.screen, 30)}
  };

  try {
    const response = await supabaseRequest("/rest/v1/analytics_events", {
      method: "POST",
      headers: {"Prefer": "return=minimal"},
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Analytics insert failed", response.status, detail.slice(0, 300));
      return res.status(503).json({error: "Analytics unavailable"});
    }
    return res.status(201).json({ok: true, stored: true});
  } catch (error) {
    console.error("Analytics insert failed", error);
    return res.status(503).json({error: "Analytics unavailable"});
  }
};

