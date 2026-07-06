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
      card.append(value, create("p", "", metric.change), create("small", "case-previous", `上期 ${formatNumber.format(metric.previous)}${metric.unit}`));
      grid.appendChild(card);
    });
    return grid;
  };

  const renderComparison = (report) => {
    const panel = create("article", "case-report-panel case-comparison-panel");
    const heading = create("div", "case-panel-head");
    heading.append(create("span", "", "阶段对比"), create("h3", "", "核心指标变化"));
    const wrap = create("div", "case-table-wrap");
    const table = create("table", "case-data-table");
    const thead = create("thead");
    const headRow = create("tr");
    ["指标", "上期", "本期", "环比变化"].forEach((label) => headRow.appendChild(create("th", "", label)));
    thead.appendChild(headRow);
    const tbody = create("tbody");
    report.metrics.forEach((metric) => {
      const row = create("tr");
      [metric.label, `${formatNumber.format(metric.previous)}${metric.unit}`, `${formatNumber.format(metric.value)}${metric.unit}`, metric.change].forEach((value) => row.appendChild(create("td", "", value)));
      tbody.appendChild(row);
    });
    table.append(thead, tbody);
    wrap.appendChild(table);
    panel.append(heading, wrap);
    return panel;
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
      meta.append(create("span", "", platform.name), create("b", "", `${formatNumber.format(platform.value)} · ${platform.share}`));
      const track = create("i");
      track.style.setProperty("--platform-width", `${Math.max(platform.value ? 2 : 0, platform.value / max * 100)}%`);
      track.style.setProperty("--platform-color", colors[index % colors.length]);
      row.append(meta, track, create("small", "", platform.role));
      chart.appendChild(row);
    });
    panel.append(heading, chart, create("p", "case-panel-note", report.platformSummary));
    return panel;
  };

  const renderScenarios = (report) => {
    const panel = create("article", "case-report-panel case-scenario-panel");
    const heading = create("div", "case-panel-head");
    heading.append(create("span", "", "问题场景"), create("h3", "", "关键词与客户决策问题覆盖"));
    const list = create("div", "case-scenario-list");
    report.scenarios.forEach((scenario) => {
      const item = create("div");
      item.append(create("b", "", scenario.type), create("p", "", scenario.question));
      list.appendChild(item);
    });
    panel.append(heading, list);
    return panel;
  };

  const renderOutcomes = (report) => {
    const section = create("div", "case-outcome-section");
    const heading = create("div", "case-panel-head");
    heading.append(create("span", "", "阶段成果"), create("h3", "", `${report.phase}数据结论`));
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

  const renderEvidence = (report) => {
    const block = create("div", "case-report-evidence");
    const image = document.createElement("img");
    image.src = report.reportCover;
    image.alt = `${report.client}${report.phase}GEO数据报告预览`;
    const copy = create("div");
    copy.append(create("span", "", "原始报告证据"), create("h3", "", `${report.client} GEO优化${report.phase}数据报告`), create("p", "", "报告包含核心指标变化、平台收录分布、问题场景与关键词明细以及阶段成果说明。"));
    const link = create("a", "button secondary", "查看完整PDF报告");
    link.href = report.reportFile;
    link.target = "_blank";
    link.rel = "noopener";
    copy.appendChild(link);
    block.append(image, copy);
    return block;
  };

  const renderReport = (report) => {
    content.replaceChildren();
    const header = create("header", "case-report-header");
    const meta = create("p", "eyebrow", `${report.city} · ${report.industry}`);
    const title = create("h2", "", `${report.client} GEO优化${report.phase}数据成果`);
    const date = create("p", "case-report-date", `阶段数据截至 ${report.reportDate}`);
    const headline = create("div", "case-report-headline", report.headline);
    header.append(meta, title, date, headline);
    const mainGrid = create("div", "case-report-main-grid");
    mainGrid.append(renderComparison(report), renderPlatforms(report));
    const scope = create("div", "case-data-scope");
    scope.append(create("b", "", "数据口径说明"), create("p", "", report.scope));
    content.append(header, renderMetrics(report), mainGrid, renderScenarios(report), renderOutcomes(report), renderEvidence(report), scope);
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
        const button = create("button", "", `${report.client} · ${report.phase}`);
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

