(() => {
  const root = document.querySelector("[data-case-reports]");
  const tabs = document.querySelector("#case-report-tabs");
  const content = document.querySelector("#case-report-content");
  if (!root || !tabs || !content) return;

  const formatNumber = new Intl.NumberFormat("zh-CN");
  const colors = ["#2d78d4", "#f05e66", "#8060dd", "#f3aa17", "#73ce16", "#12a89e", "#079db6", "#91a2b5"];
  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const renderMetrics = (report) => {
    const grid = create("div", "case-metric-grid");
    report.metrics.forEach((metric, index) => {
      const card = create("article", index === 1 ? "highlight" : "");
      card.appendChild(create("span", "", metric.label));
      const value = create("strong");
      value.append(document.createTextNode(formatNumber.format(metric.value)), create("small", "", metric.unit));
      card.append(value, create("p", "", metric.note));
      grid.appendChild(card);
    });
    return grid;
  };

  const renderPlatforms = (report) => {
    const panel = create("article", "case-report-panel case-platform-panel");
    const heading = create("div", "case-panel-head");
    heading.append(create("span", "", "八大AI平台"), create("h3", "", "累计收录分布"));
    const chart = create("div", "case-platform-chart");
    const max = Math.max(...report.platforms.map((platform) => platform.value), 1);
    report.platforms.forEach((platform, index) => {
      const row = create("div", "case-platform-row");
      const meta = create("div");
      meta.append(create("span", "", platform.name), create("b", "", formatNumber.format(platform.value)));
      const track = create("i");
      track.style.setProperty("--platform-width", `${Math.max(platform.value ? 2 : 0, platform.value / max * 100)}%`);
      track.style.setProperty("--platform-color", colors[index % colors.length]);
      row.append(meta, track);
      chart.appendChild(row);
    });
    panel.append(heading, chart, create("p", "case-panel-note", report.platformSummary));
    return panel;
  };

  const renderScenarios = (report) => {
    const panel = create("article", "case-report-panel case-scenario-panel");
    const heading = create("div", "case-panel-head");
    heading.append(create("span", "", "问题场景"), create("h3", "", "客户决策场景覆盖"));
    const list = create("div", "case-scenario-list");
    report.scenarios.forEach((scenario) => list.appendChild(create("span", "", scenario)));
    panel.append(heading, list);
    return panel;
  };

  const renderOutcomes = (report) => {
    const section = create("div", "case-outcome-section");
    const heading = create("div", "case-panel-head");
    heading.append(create("span", "", "成果概览"), create("h3", "", "GEO优化后的主要变化"));
    const grid = create("div", "case-outcome-grid");
    report.outcomes.forEach((outcome, index) => {
      const card = create("article");
      card.dataset.tone = String(index + 1);
      card.append(create("h4", "", outcome.title), create("p", "", outcome.text));
      grid.appendChild(card);
    });
    const conclusion = create("div", "case-stage-conclusion");
    conclusion.append(create("b", "", "阶段结论"), create("p", "", report.stageConclusion));
    section.append(heading, grid, conclusion);
    return section;
  };

  const renderReport = (report) => {
    content.replaceChildren();
    const header = create("header", "case-report-header");
    const meta = create("p", "eyebrow", `${report.city} · ${report.industry}`);
    const title = create("h2", "", `${report.client} GEO优化成果`);
    const headline = create("div", "case-report-headline", report.headline);
    header.append(meta, title, headline);
    const mainGrid = create("div", "case-report-main-grid");
    mainGrid.append(renderPlatforms(report), renderScenarios(report));
    const scope = create("div", "case-data-scope");
    scope.append(create("b", "", "数据口径说明"), create("p", "", report.scope));
    content.append(header, renderMetrics(report), mainGrid, renderOutcomes(report), scope);
  };

  fetch("./assets/data/case-reports.json", {headers: {"Accept": "application/json"}})
    .then((response) => {
      if (!response.ok) throw new Error("案例数据读取失败");
      return response.json();
    })
    .then((data) => {
      const reports = Array.isArray(data.reports) ? data.reports : [];
      if (!reports.length) throw new Error("暂无案例数据");
      tabs.replaceChildren();
      reports.forEach((report, index) => {
        const button = create("button", "", report.client);
        button.type = "button";
        button.setAttribute("aria-pressed", String(index === 0));
        button.addEventListener("click", () => {
          tabs.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
          renderReport(report);
        });
        tabs.appendChild(button);
      });
      renderReport(reports[0]);
      root.dataset.state = "ready";
    })
    .catch(() => {
      content.replaceChildren(create("p", "case-report-error", "案例数据正在整理中"));
      root.dataset.state = "error";
    });
})();
