const adminPasswordSessionKey = "zt_admin_password";
const readAdminPassword = () => { try { return sessionStorage.getItem(adminPasswordSessionKey) || ""; } catch { return ""; } };
const rememberAdminPassword = (password) => { try { sessionStorage.setItem(adminPasswordSessionKey, password); } catch {} };
const setBoxStatus = (box, message, type = "info") => { box.textContent = message; box.dataset.type = type; };
const analyticsPassword = document.querySelector("#analytics-password");
analyticsPassword.value = readAdminPassword();
const analyticsDays = document.querySelector("#analytics-days");
const loadAnalyticsButton = document.querySelector("#load-analytics");
const exportAnalyticsButton = document.querySelector("#export-analytics");
const analyticsStatus = document.querySelector("#analytics-status");
const analyticsDashboard = document.querySelector("#analytics-dashboard");
const analyticsTrend = document.querySelector("#analytics-trend");
const analyticsEvents = document.querySelector("#analytics-events");
let analyticsSnapshot = null;

const numberFormat = new Intl.NumberFormat("zh-CN");
const sourceNames = {
  direct: "直接访问",
  baidu: "百度",
  bing: "必应",
  google: "Google",
  wechat: "微信",
  xiaohongshu: "小红书",
  zhihu: "知乎",
  doubao: "豆包",
  deepseek: "DeepSeek",
  kimi: "Kimi",
  yuanbao: "腾讯元宝",
  other: "其他来源"
};
const eventNames = {
  page_view: "浏览页面",
  cta_click: "点击方案",
  phone_click: "点击电话",
  qr_view: "查看二维码",
  article_click: "打开文章",
  case_image_view: "查看案例图"
};
const deviceNames = {mobile: "手机", tablet: "平板", desktop: "电脑"};
const pageLabels = new Map([
  ["/", "首页"],
  ["/solutions.html", "解决方案"],
  ["/cases.html", "案例场景"],
  ["/results.html", "成果验证"],
  ["/reviews.html", "客户评价"],
  ["/insights.html", "政天智见"],
  ["/about.html", "关于政天"]
]);
let pageLabelsLoaded = false;

const normalizePagePath = (value) => {
  const path = String(value || "/").split("#")[0].split("?")[0] || "/";
  return path === "/index.html" ? "/" : path;
};

const loadPageLabels = async () => {
  if (pageLabelsLoaded) return;
  pageLabelsLoaded = true;
  try {
    const response = await fetch("/insights.html", {cache: "no-store"});
    if (!response.ok) return;
    const documentCopy = new DOMParser().parseFromString(await response.text(), "text/html");
    documentCopy.querySelectorAll(".knowledge-card h2 a[href]").forEach((link) => {
      const path = normalizePagePath(new URL(link.getAttribute("href"), location.origin).pathname);
      if (link.textContent.trim()) pageLabels.set(path, link.textContent.trim());
    });
  } catch { /* Friendly labels are optional. */ }
};

const formatPageName = (value) => {
  const path = normalizePagePath(value);
  if (pageLabels.has(path)) return pageLabels.get(path);
  if (path.startsWith("/articles/")) return `文章：${decodeURIComponent(path.split("/").pop()).replace(/\.html$/, "")}`;
  if (path.startsWith("/topics/")) return `专题：${decodeURIComponent(path.split("/").pop()).replace(/\.html$/, "")}`;
  return path;
};

const mergePageRows = (rows) => {
  const merged = new Map();
  (rows || []).forEach((row) => {
    const path = normalizePagePath(row.name);
    merged.set(path, (merged.get(path) || 0) + (Number(row.value) || 0));
  });
  return Array.from(merged, ([name, value]) => ({name, value})).sort((a, b) => b.value - a.value);
};

const renderEmpty = (container, message) => {
  container.replaceChildren();
  const empty = document.createElement("p");
  empty.className = "analytics-empty";
  empty.textContent = message;
  container.appendChild(empty);
};

const renderRankList = (container, rows, formatter = (value) => value) => {
  if (!rows?.length) return renderEmpty(container, "当前周期暂无数据");
  container.replaceChildren();
  const max = Math.max(...rows.map((row) => Number(row.value) || 0), 1);
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "analytics-rank-item";
    const line = document.createElement("div");
    const label = document.createElement("span");
    const value = document.createElement("b");
    label.textContent = `${String(index + 1).padStart(2, "0")}  ${formatter(row.name)}`;
    value.textContent = numberFormat.format(row.value || 0);
    line.append(label, value);
    const bar = document.createElement("i");
    bar.style.setProperty("--bar-width", `${Math.max(3, (Number(row.value) || 0) / max * 100)}%`);
    item.append(line, bar);
    container.appendChild(item);
  });
};

const renderTrend = (rows) => {
  if (!rows?.length) return renderEmpty(analyticsTrend, "当前周期暂无访问数据");
  analyticsTrend.replaceChildren();
  const max = Math.max(...rows.map((row) => Number(row.page_views) || 0), 1);
  const labelStep = rows.length > 45 ? 10 : rows.length > 14 ? 5 : 1;
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "analytics-trend-day";
    item.title = `${row.day}：${row.page_views || 0} 次浏览，${row.visitors || 0} 位访客`;
    const bars = document.createElement("div");
    bars.className = "analytics-trend-columns";
    const pageViews = document.createElement("i");
    const visitors = document.createElement("i");
    pageViews.style.height = `${Math.max(row.page_views ? 5 : 0, (Number(row.page_views) || 0) / max * 100)}%`;
    visitors.style.height = `${Math.max(row.visitors ? 5 : 0, (Number(row.visitors) || 0) / max * 100)}%`;
    bars.append(pageViews, visitors);
    const label = document.createElement("small");
    label.textContent = index % labelStep === 0 || index === rows.length - 1 ? String(row.day).slice(5) : "";
    item.append(bars, label);
    analyticsTrend.appendChild(item);
  });
};

const renderEvents = (rows) => {
  analyticsEvents.replaceChildren();
  if (!rows?.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "analytics-empty";
    cell.textContent = "当前周期暂无事件记录";
    row.appendChild(cell);
    analyticsEvents.appendChild(row);
    return;
  }
  rows.forEach((event) => {
    const row = document.createElement("tr");
    const values = [
      new Intl.DateTimeFormat("zh-CN", {month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false}).format(new Date(event.created_at)),
      eventNames[event.event_type] || event.event_type,
      formatPageName(event.page_path),
      sourceNames[event.source] || event.source || "直接访问",
      event.location || "未知地区",
      deviceNames[event.device] || event.device || "电脑"
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    analyticsEvents.appendChild(row);
  });
};

const renderAnalytics = (data) => {
  const totals = data.totals || {};
  document.querySelectorAll("[data-analytics-metric]").forEach((element) => {
    element.textContent = numberFormat.format(totals[element.dataset.analyticsMetric] || 0);
  });
  renderTrend(data.daily || []);
  renderRankList(document.querySelector("#analytics-sources"), data.sources || [], (name) => sourceNames[name] || name || "直接访问");
  renderRankList(document.querySelector("#analytics-cities"), data.cities || []);
  renderRankList(document.querySelector("#analytics-pages"), mergePageRows(data.pages), formatPageName);
  renderEvents(data.recent || []);
  document.querySelector("#analytics-updated").textContent = `更新于 ${new Intl.DateTimeFormat("zh-CN", {month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false}).format(new Date(data.generatedAt))}`;
  analyticsDashboard.hidden = false;
};

const loadAnalytics = async () => {
  if (!analyticsPassword.value) return setBoxStatus(analyticsStatus, "请先输入管理密码。", "error");
  loadAnalyticsButton.disabled = true;
  exportAnalyticsButton.disabled = true;
  setBoxStatus(analyticsStatus, "正在读取真实访问数据…", "loading");
  try {
    const response = await fetch("/api/analytics", {
      method: "POST",
      headers: {"Content-Type": "application/json", "X-Admin-Password": analyticsPassword.value},
      body: JSON.stringify({days: Number(analyticsDays.value)})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "数据加载失败，请稍后重试。");
    rememberAdminPassword(analyticsPassword.value);
    await loadPageLabels();
    analyticsSnapshot = result;
    renderAnalytics(result);
    exportAnalyticsButton.disabled = false;
    setBoxStatus(analyticsStatus, `已加载最近 ${result.days} 天的真实数据。`, "success");
  } catch (error) {
    setBoxStatus(analyticsStatus, error.message, "error");
  } finally {
    loadAnalyticsButton.disabled = false;
  }
};

const exportAnalytics = () => {
  if (!analyticsSnapshot?.recent?.length) return;
  const rows = [["时间", "行为", "说明", "页面", "来源", "地区", "设备"]];
  analyticsSnapshot.recent.forEach((event) => rows.push([
    event.created_at,
    eventNames[event.event_type] || event.event_type,
    event.event_label || "",
    formatPageName(event.page_path),
    sourceNames[event.source] || event.source || "直接访问",
    event.location || "未知地区",
    deviceNames[event.device] || event.device || "电脑"
  ]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], {type: "text/csv;charset=utf-8"}));
  link.download = `政天数据中心-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

loadAnalyticsButton?.addEventListener("click", loadAnalytics);
exportAnalyticsButton?.addEventListener("click", exportAnalytics);
analyticsPassword?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  loadAnalytics();
});
analyticsDays?.addEventListener("change", () => {
  if (analyticsSnapshot) loadAnalytics();
});

if (location.hash === "#analytics" && analyticsPassword?.value) loadAnalytics();
