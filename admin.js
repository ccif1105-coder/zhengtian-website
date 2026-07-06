const form = document.querySelector("#article-editor");
const titleInput = document.querySelector("#article-title");
const summaryInput = document.querySelector("#article-summary");
const bodyInput = document.querySelector("#article-body");
const coverInput = document.querySelector("#article-cover");
const statusBox = document.querySelector("#publish-status");
const publishButton = document.querySelector("#publish-button");
let published = false;

const readingTime = () => Math.max(1, Math.ceil(bodyInput.value.trim().length / 500));
const createSlug = () => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `article-${date}-${time}`;
};

const setStatus = (message, type = "info") => {
  statusBox.textContent = message;
  statusBox.dataset.type = type;
};

const updateCounts = () => {
  document.querySelector('[data-count="title"]').textContent = titleInput.value.length;
  document.querySelector('[data-count="summary"]').textContent = summaryInput.value.length;
  document.querySelector('[data-count="body"]').textContent = bodyInput.value.length;
};

const fileToPayload = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve(null);
  if (file.size > 2 * 1024 * 1024) return reject(new Error("封面图片不能超过2MB。"));
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reject(new Error("封面图片格式不支持。"));
  const reader = new FileReader();
  reader.onload = () => resolve({name: file.name, type: file.type, data: String(reader.result).split(",")[1]});
  reader.onerror = () => reject(new Error("封面图片读取失败。"));
  reader.readAsDataURL(file);
});

[titleInput, summaryInput, bodyInput].forEach((input) => input.addEventListener("input", updateCounts));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (published) {
    setStatus("这篇文章已经发布，请刷新页面后再发布新文章。", "success");
    return;
  }
  if (!form.reportValidity()) return;
  if (bodyInput.value.trim().length < 100) {
    setStatus("文章正文至少需要100字。", "error");
    return;
  }
  publishButton.disabled = true;
  setStatus("正在发布并同步到网站…", "loading");
  try {
    const response = await fetch("/api/publish", {
      method: "POST",
      headers: {"Content-Type": "application/json", "X-Admin-Password": document.querySelector("#admin-password").value},
      body: JSON.stringify({
        title: titleInput.value.trim(),
        summary: summaryInput.value.trim(),
        body: bodyInput.value.trim(),
        slug: createSlug(),
        category: "品牌文章",
        keywords: titleInput.value.trim(),
        readingTime: readingTime(),
        cover: await fileToPayload(coverInput.files[0])
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "发布失败，请稍后重试。");
    document.querySelector("#admin-password").value = "";
    published = true;
    publishButton.textContent = "已发布";
    setStatus(`发布成功，网站正在自动更新：${result.url}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    publishButton.disabled = published;
  }
});

updateCounts();

const tabButtons = document.querySelectorAll("[data-admin-tab]");
const adminPanels = document.querySelectorAll("[data-admin-panel]");
const adminShell = document.querySelector(".simple-publisher");
const managePassword = document.querySelector("#manage-password");
const loadArticlesButton = document.querySelector("#load-articles");
const manageStatus = document.querySelector("#manage-status");
const manageArticleList = document.querySelector("#manage-article-list");
const editForm = document.querySelector("#article-edit-form");
const editStatus = document.querySelector("#edit-status");
const editSlug = document.querySelector("#edit-article-slug");
const editTitle = document.querySelector("#edit-article-title");
const editSummary = document.querySelector("#edit-article-summary");
const editBody = document.querySelector("#edit-article-body");
const editCover = document.querySelector("#edit-article-cover");
const removeCover = document.querySelector("#remove-article-cover");
const currentCoverLabel = document.querySelector("#current-cover-label");
const saveArticleButton = document.querySelector("#save-article");
const deleteArticleButton = document.querySelector("#delete-article");
let editingArticle = null;

const setBoxStatus = (box, message, type = "info") => {
  box.textContent = message;
  box.dataset.type = type;
};

const requestManagement = async (payload) => {
  const password = managePassword.value;
  if (!password) throw new Error("请先输入管理密码。");
  const response = await fetch("/api/manage", {
    method: "POST",
    headers: {"Content-Type": "application/json", "X-Admin-Password": password},
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "操作失败，请稍后重试。");
  return result;
};

tabButtons.forEach((button) => button.addEventListener("click", () => {
  const target = button.dataset.adminTab;
  if (adminShell) adminShell.dataset.activePanel = target;
  tabButtons.forEach((item) => item.setAttribute("aria-selected", String(item === button)));
  adminPanels.forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== target;
  });
}));

const createArticleRow = (article) => {
  const row = document.createElement("article");
  row.className = "manage-article-row";
  const content = document.createElement("div");
  const meta = document.createElement("p");
  meta.className = "article-meta";
  meta.textContent = `${article.date} · 约 ${article.readingTime} 分钟`;
  const heading = document.createElement("h3");
  heading.textContent = article.title;
  const summary = document.createElement("p");
  summary.textContent = article.summary;
  content.append(meta, heading, summary);
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "button secondary";
  editButton.textContent = "编辑";
  editButton.dataset.editSlug = article.slug;
  row.append(content, editButton);
  return row;
};

const renderArticleList = (articles) => {
  manageArticleList.replaceChildren();
  if (!articles.length) {
    const empty = document.createElement("p");
    empty.className = "manage-empty";
    empty.textContent = "暂时没有已发布文章。";
    manageArticleList.appendChild(empty);
    return;
  }
  articles.forEach((article) => manageArticleList.appendChild(createArticleRow(article)));
};

const loadArticleList = async () => {
  loadArticlesButton.disabled = true;
  setBoxStatus(manageStatus, "正在加载文章…", "loading");
  try {
    const result = await requestManagement({action: "list"});
    renderArticleList(result.articles || []);
    setBoxStatus(manageStatus, `已加载 ${result.articles.length} 篇文章。`, "success");
  } catch (error) {
    setBoxStatus(manageStatus, error.message, "error");
  } finally {
    loadArticlesButton.disabled = false;
  }
};

const openArticleEditor = async (slug) => {
  setBoxStatus(manageStatus, "正在读取文章…", "loading");
  try {
    const result = await requestManagement({action: "get", slug});
    editingArticle = result.article;
    editSlug.value = editingArticle.slug;
    editTitle.value = editingArticle.title;
    editSummary.value = editingArticle.summary;
    editBody.value = editingArticle.body;
    editCover.value = "";
    editCover.disabled = false;
    removeCover.checked = false;
    removeCover.disabled = !editingArticle.coverPath;
    currentCoverLabel.textContent = editingArticle.coverPath ? `当前封面：${editingArticle.coverPath}` : "当前使用默认封面。";
    document.querySelector("#editing-article-label").textContent = `正在编辑：${editingArticle.title}`;
    editForm.hidden = false;
    setBoxStatus(editStatus, "");
    setBoxStatus(manageStatus, "文章已打开，可以开始修改。", "success");
    editForm.scrollIntoView({behavior: "smooth", block: "start"});
  } catch (error) {
    setBoxStatus(manageStatus, error.message, "error");
  }
};

loadArticlesButton.addEventListener("click", loadArticleList);

manageArticleList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-slug]");
  if (button) openArticleEditor(button.dataset.editSlug);
});

document.querySelector("#cancel-edit").addEventListener("click", () => {
  editingArticle = null;
  editForm.reset();
  editForm.hidden = true;
  setBoxStatus(editStatus, "");
});

removeCover.addEventListener("change", () => {
  editCover.disabled = removeCover.checked;
  if (removeCover.checked) editCover.value = "";
});

editCover.addEventListener("change", () => {
  if (editCover.files.length) removeCover.checked = false;
});

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editForm.reportValidity() || !editingArticle) return;
  saveArticleButton.disabled = true;
  deleteArticleButton.disabled = true;
  setBoxStatus(editStatus, "正在保存并同步到网站…", "loading");
  try {
    const result = await requestManagement({
      action: "update",
      slug: editSlug.value,
      title: editTitle.value.trim(),
      summary: editSummary.value.trim(),
      body: editBody.value.trim(),
      category: editingArticle.category || "品牌文章",
      keywords: editingArticle.keywords || editTitle.value.trim(),
      readingTime: Math.max(1, Math.ceil(editBody.value.trim().length / 500)),
      cover: await fileToPayload(editCover.files[0]),
      removeCover: removeCover.checked
    });
    editingArticle.title = editTitle.value.trim();
    setBoxStatus(editStatus, `修改已保存，网站正在更新：${result.url}`, "success");
    await loadArticleList();
  } catch (error) {
    setBoxStatus(editStatus, error.message, "error");
  } finally {
    saveArticleButton.disabled = false;
    deleteArticleButton.disabled = false;
  }
});

deleteArticleButton.addEventListener("click", async () => {
  if (!editingArticle) return;
  const confirmed = window.confirm(`确认删除《${editingArticle.title}》？\n\n文章页面、封面和相关索引会同时删除，此操作无法在后台撤销。`);
  if (!confirmed) return;
  saveArticleButton.disabled = true;
  deleteArticleButton.disabled = true;
  setBoxStatus(editStatus, "正在删除并同步到网站…", "loading");
  try {
    await requestManagement({action: "delete", slug: editingArticle.slug, confirmTitle: editingArticle.title});
    editForm.reset();
    editForm.hidden = true;
    editingArticle = null;
    setBoxStatus(manageStatus, "文章已删除，网站正在自动更新。", "success");
    await loadArticleList();
  } catch (error) {
    setBoxStatus(editStatus, error.message, "error");
  } finally {
    saveArticleButton.disabled = false;
    deleteArticleButton.disabled = false;
  }
});

const analyticsPassword = document.querySelector("#analytics-password");
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
      event.page_path || "/",
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
  renderRankList(document.querySelector("#analytics-pages"), data.pages || []);
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
    event.page_path || "/",
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
