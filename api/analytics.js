const crypto = require("crypto");

const constantTimeEqual = (actual, expected) => {
  const a = Buffer.from(String(actual || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

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
  if (req.method !== "POST") return res.status(405).json({error: "仅支持POST请求。"});
  if (!process.env.ADMIN_PASSWORD) return res.status(503).json({error: "管理密码尚未配置。"});
  if (!constantTimeEqual(req.headers["x-admin-password"], process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({error: "管理密码错误。"});
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({error: "数据中心尚未连接数据库。", configured: false});
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({error: "请求内容不是有效的JSON。"});
  }
  const days = [7, 30, 90].includes(Number(body.days)) ? Number(body.days) : 30;

  try {
    const response = await supabaseRequest("/rest/v1/rpc/get_analytics_summary", {
      method: "POST",
      body: JSON.stringify({p_days: days})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Analytics summary failed", response.status, data);
      return res.status(503).json({error: "数据读取失败，请检查数据库初始化是否完成。"});
    }
    return res.status(200).json({ok: true, configured: true, ...data});
  } catch (error) {
    console.error("Analytics summary failed", error);
    return res.status(503).json({error: "数据读取失败，请稍后重试。"});
  }
};

