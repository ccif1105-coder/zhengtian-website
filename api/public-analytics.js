const toNumber = (value) => Math.max(0, Number(value) || 0);

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
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=600");
  if (req.method !== "GET") return res.status(405).json({error: "仅支持GET请求。"});
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({error: "成果数据正在初始化。"});
  }

  try {
    const response = await supabaseRequest("/rest/v1/rpc/get_analytics_summary", {
      method: "POST",
      body: JSON.stringify({p_days: 90})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Public analytics failed", response.status, data);
      return res.status(503).json({error: "成果数据暂时不可用。"});
    }
    const totals = data.totals || {};
    return res.status(200).json({
      ok: true,
      periodDays: 90,
      generatedAt: data.generatedAt,
      totals: {
        pageViews: toNumber(totals.page_views),
        visitors: toNumber(totals.visitors),
        sessions: toNumber(totals.sessions),
        touchpoints: toNumber(totals.cta_clicks) + toNumber(totals.phone_clicks) + toNumber(totals.qr_views)
      },
      daily: (data.daily || []).slice(-30).map((row) => ({
        day: row.day,
        pageViews: toNumber(row.page_views),
        visitors: toNumber(row.visitors)
      })),
      sources: (data.sources || []).slice(0, 6).map((row) => ({name: String(row.name || "direct"), value: toNumber(row.value)})),
      cities: (data.cities || []).slice(0, 6).map((row) => ({name: String(row.name || "未知地区"), value: toNumber(row.value)})),
      pages: (data.pages || []).slice(0, 6).map((row) => ({name: String(row.name || "/"), value: toNumber(row.value)}))
    });
  } catch (error) {
    console.error("Public analytics failed", error);
    return res.status(503).json({error: "成果数据暂时不可用。"});
  }
};

