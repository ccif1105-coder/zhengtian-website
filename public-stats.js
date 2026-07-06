(() => {
  const root = document.querySelector("[data-public-analytics]");
  if (!root) return;

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
  const pageNames = {
    "/": "官网首页",
    "/index.html": "官网首页",
    "/solutions.html": "解决方案",
    "/cases.html": "案例场景",
    "/results.html": "成果验证",
    "/reviews.html": "客户评价",
    "/insights.html": "政天智见",
    "/about.html": "关于政天"
  };

  const renderRank = (container, rows, formatName) => {
    container.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "public-data-empty";
      empty.textContent = "数据正在持续积累";
      container.appendChild(empty);
      return;
    }
    const max = Math.max(...rows.map((row) => row.value), 1);
    rows.forEach((row, index) => {
      const item = document.createElement("div");
      item.className = "public-rank-item";
      const line = document.createElement("div");
      const label = document.createElement("span");
      const value = document.createElement("b");
      label.textContent = `${String(index + 1).padStart(2, "0")}  ${formatName(row.name)}`;
      value.textContent = numberFormat.format(row.value);
      line.append(label, value);
      const bar = document.createElement("i");
      bar.style.setProperty("--rank-width", `${Math.max(4, row.value / max * 100)}%`);
      item.append(line, bar);
      container.appendChild(item);
    });
  };

  const renderTrend = (rows) => {
    const trend = document.querySelector("#public-data-trend");
    trend.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "public-data-empty";
      empty.textContent = "趋势将在产生访问后显示";
      trend.appendChild(empty);
      return;
    }
    const max = Math.max(...rows.map((row) => row.pageViews), 1);
    rows.forEach((row, index) => {
      const day = document.createElement("div");
      day.className = "public-trend-day";
      day.title = `${row.day}：${row.pageViews} 次浏览，${row.visitors} 位访客`;
      const columns = document.createElement("div");
      columns.className = "public-trend-columns";
      const views = document.createElement("i");
      const visitors = document.createElement("i");
      views.style.height = `${Math.max(row.pageViews ? 5 : 0, row.pageViews / max * 100)}%`;
      visitors.style.height = `${Math.max(row.visitors ? 5 : 0, row.visitors / max * 100)}%`;
      columns.append(views, visitors);
      const label = document.createElement("small");
      label.textContent = index % 5 === 0 || index === rows.length - 1 ? String(row.day).slice(5) : "";
      day.append(columns, label);
      trend.appendChild(day);
    });
  };

  fetch("/api/public-analytics", {headers: {"Accept": "application/json"}})
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "数据暂时不可用");
      return data;
    })
    .then((data) => {
      Object.entries(data.totals || {}).forEach(([key, value]) => {
        const element = document.querySelector(`[data-public-stat="${key}"]`);
        if (element) element.textContent = numberFormat.format(value);
      });
      renderTrend(data.daily || []);
      renderRank(document.querySelector("#public-data-sources"), data.sources || [], (name) => sourceNames[name] || name);
      renderRank(document.querySelector("#public-data-cities"), data.cities || [], (name) => name);
      renderRank(document.querySelector("#public-data-pages"), data.pages || [], (name) => pageNames[name] || name);
      const updated = new Intl.DateTimeFormat("zh-CN", {month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false}).format(new Date(data.generatedAt));
      document.querySelector("#public-data-status").textContent = `近90天官网数据 · 更新于 ${updated}`;
      root.dataset.state = "ready";
    })
    .catch(() => {
      document.querySelector("#public-data-status").textContent = "实时数据正在更新，请稍后查看";
      renderTrend([]);
      ["#public-data-sources", "#public-data-cities", "#public-data-pages"].forEach((selector) => renderRank(document.querySelector(selector), [], (name) => name));
      root.dataset.state = "error";
    });
})();

