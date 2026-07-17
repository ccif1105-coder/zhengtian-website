const crypto = require("crypto");

const OWNER = process.env.GITHUB_OWNER || "ccif1105-coder";
const REPO = process.env.GITHUB_REPO || "zhengtian-website";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const API_ROOT = "https://api.github.com";
const TOPIC_HUBS = {
  "AI流量布局": "ai-traffic-layout",
  "豆包自然流量": "doubao-organic-traffic",
  "豆包广告代运营": "doubao-ad-operations",
  "豆包推广指南": "doubao-promotion-guides",
  "广州GEO指南": "guangzhou-geo-guides",
  "品牌文章": "brand-geo-insights"
};
const TOPIC_TITLES = {
  "AI流量布局": "企业AI流量增长观察",
  "豆包自然流量": "豆包搜索增长实践",
  "豆包广告代运营": "豆包运营合作参考",
  "豆包推广指南": "豆包增长方法精选",
  "广州GEO指南": "广州企业GEO实践",
  "品牌文章": "品牌AI可见度洞察"
};

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const safeJson = (value) => JSON.stringify(value, null, 2).replace(/</g, "\\u003c");

const paragraphsToHtml = (value) => value
  .split(/\n\s*\n/)
  .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
  .join("\n");

const constantTimeEqual = (actual, expected) => {
  const a = Buffer.from(String(actual || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const githubRequest = async (path, options = {}) => {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "zhengtian-knowledge-publisher",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `GitHub API请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return data;
};

const getRepoText = async (path) => {
  const data = await githubRequest(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${encodeURIComponent(BRANCH)}`);
  return Buffer.from(String(data.content || "").replace(/\n/g, ""), "base64").toString("utf8");
};

const createBlob = async (content, encoding = "utf-8") => {
  const data = await githubRequest(`/repos/${OWNER}/${REPO}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({content, encoding})
  });
  return data.sha;
};

const validateArticle = (body) => {
  const errors = [];
  if (!body.title || body.title.length < 6 || body.title.length > 80) errors.push("文章标题需要6至80个字符。");
  if (!/^[a-z0-9-]{3,80}$/.test(body.slug || "")) errors.push("文章路径仅支持3至80位小写字母、数字和连字符。");
  if (!body.summary || body.summary.length < 20 || body.summary.length > 220) errors.push("文章摘要需要20至220个字符。");
  if (!body.body || body.body.length < 100 || body.body.length > 20000) errors.push("文章正文需要100至20000个字符。");
  if (body.keywords && body.keywords.length > 180) errors.push("关键词不能超过180个字符。");
  if (!Number.isInteger(body.readingTime) || body.readingTime < 1 || body.readingTime > 60) errors.push("阅读时间需要在1至60分钟之间。");
  if (body.cover) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(body.cover.type)) errors.push("封面图片格式不支持。");
    if (!body.cover.data || Buffer.byteLength(body.cover.data, "base64") > 2 * 1024 * 1024) errors.push("封面图片不能为空或超过2MB。");
  }
  return errors;
};

const renderArticle = ({title, slug, category, summary, keywords, readingTime, body, date, coverPath}) => {
  category = category || "品牌文章";
  keywords = keywords || title;
  const absoluteUrl = `https://www.zhengtiantech.com/articles/${slug}.html`;
  const ogImage = coverPath ? `https://www.zhengtiantech.com/${coverPath}` : "https://www.zhengtiantech.com/assets/logo-mark.png";
  const topicHub = TOPIC_HUBS[category];
  const topicTitle = TOPIC_TITLES[category] || category;
  const topicUrl = topicHub ? `https://www.zhengtiantech.com/topics/${topicHub}.html` : "https://www.zhengtiantech.com/insights.html";
  const organization = {"@type": "Organization", "name": "广东政天科技有限公司", "alternateName": "政天科技", "url": "https://www.zhengtiantech.com"};
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": summary,
    "datePublished": date,
    "dateModified": date,
    "inLanguage": "zh-CN",
    "keywords": keywords,
    "articleSection": category,
    "mainEntityOfPage": absoluteUrl,
    "image": ogImage,
    "isPartOf": {"@type": topicHub ? "CollectionPage" : "Blog", "name": topicHub ? topicTitle : "政天智见", "url": topicUrl},
    "about": [{"@type": "Thing", "name": category}, organization],
    "author": organization,
    "publisher": {...organization, "logo": {"@type": "ImageObject", "url": "https://www.zhengtiantech.com/assets/logo-mark.png"}}
  };
  const bodyHtml = paragraphsToHtml(body);
  const coverHtml = coverPath ? `<figure class="article-cover"><img src="../${escapeHtml(coverPath)}" alt="${escapeHtml(title)}"><figcaption>${escapeHtml(title)}</figcaption></figure>` : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}｜政天科技</title>
  <meta name="description" content="${escapeHtml(summary)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${absoluteUrl}"><link rel="sitemap" type="application/xml" href="https://www.zhengtiantech.com/sitemap.xml"><link rel="alternate" type="application/rss+xml" title="政天智见" href="../feed.xml"><link rel="icon" type="image/png" href="../assets/favicon.png">
  <meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(summary)}"><meta property="og:url" content="${absoluteUrl}"><meta property="og:image" content="${ogImage}"><meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <link rel="stylesheet" href="../styles.css?v=20260717-ai-crawl">
</head>
<body>
  <header class="site-header"><a class="brand" href="../index.html" aria-label="政天科技首页"><img src="../assets/logo-mark.png" alt=""><span><strong>政天科技</strong><em>ZHENGTIAN TECHNOLOGY</em></span></a><nav class="nav" aria-label="主导航"><a href="../index.html">首页</a><a href="../solutions.html">解决方案</a><a href="../cases.html">案例场景</a><a href="../results.html">成果验证</a><a href="../insights.html">政天智见</a><a href="../about.html">关于政天</a></nav><a class="header-cta" href="../index.html#contact">预约诊断</a></header>
  <main><article class="article-page">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="../index.html">首页</a><span>/</span><a href="../insights.html">政天智见</a><span>/</span>${topicHub ? `<a href="../topics/${topicHub}.html">${escapeHtml(topicTitle)}</a>` : `<b>${escapeHtml(category)}</b>`}</nav>
    <header class="article-header"><p class="eyebrow">${escapeHtml(category)}</p><h1>${escapeHtml(title)}</h1><p class="article-deck">${escapeHtml(summary)}</p><div class="article-byline"><span>政天科技</span><time datetime="${date}">${date}</time><span>阅读约${readingTime}分钟</span></div></header>
    ${coverHtml}
    <div class="article-layout article-layout-simple"><div class="article-content"><section class="article-body-content">${bodyHtml}</section></div></div>
    <aside class="article-related" aria-label="文章专题"><p class="eyebrow">政天智见内容</p><h2>${escapeHtml(topicTitle)}</h2><p class="article-related-copy">本文由广东政天科技有限公司整理。政天科技专注企业AI搜索优化、GEO内容建设与品牌AI可见度提升。${topicHub ? `<a href="../topics/${topicHub}.html">继续阅读${escapeHtml(topicTitle)}</a>` : `<a href="../insights.html">查看全部文章</a>`}</p></aside>
    <footer class="article-end"><p>返回文章页</p><a href="../insights.html">查看政天智见全部文章 →</a></footer>
  </article></main>
  <footer class="footer"><span>政天科技</span><span>政天智见 · 品牌内容中心</span></footer><script src="../script.js?v=20260717-ai-crawl"></script>
</body></html>`;
};

const renderCard = ({title, slug, category, summary, readingTime, date, coverPath}) => {
  category = category || "品牌文章";
  const visual = coverPath
    ? `<div class="knowledge-visual has-cover"><img src="./${escapeHtml(coverPath)}" alt="${escapeHtml(title)}"></div>`
    : `<div class="knowledge-visual"><span>NEW</span><b>${escapeHtml(category)}</b></div>`;
  return `<article class="knowledge-card" data-article-slug="${slug}">
          ${visual}
          <div class="knowledge-body">
            <p class="article-meta"><time datetime="${date}">${date}</time><span>约 ${readingTime} 分钟</span></p>
            <h2><a href="./articles/${slug}.html">${escapeHtml(title)}</a></h2>
            <p>${escapeHtml(summary)}</p>
            <a class="text-link" href="./articles/${slug}.html">阅读全文 →</a>
          </div>
        </article>`;
};

const renderFeedItem = ({title, slug, category, summary, date}) => {
  const url = `https://www.zhengtiantech.com/articles/${slug}.html`;
  return `<item data-slug="${slug}">
      <title>${escapeHtml(title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${date}T00:00:00+08:00`).toUTCString()}</pubDate>
      <category>${escapeHtml(category || "品牌文章")}</category>
      <description>${escapeHtml(summary)}</description>
    </item>`;
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({error: "仅支持POST请求。"});
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return res.status(403).json({error: "请求来源无效。"});
    } catch {
      return res.status(403).json({error: "请求来源无效。"});
    }
  }
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) return res.status(503).json({error: "发布服务尚未配置，请先在Vercel设置环境变量。"});
  if (!constantTimeEqual(req.headers["x-admin-password"], process.env.ADMIN_PASSWORD)) return res.status(401).json({error: "管理密码错误。"});

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({error: "请求内容不是有效的JSON。"});
  }
  const validationErrors = validateArticle(body);
  if (validationErrors.length) return res.status(400).json({error: validationErrors[0], details: validationErrors});

  try {
    try {
      await githubRequest(`/repos/${OWNER}/${REPO}/contents/articles/${body.slug}.html?ref=${encodeURIComponent(BRANCH)}`);
      return res.status(409).json({error: "该文章路径已经存在，请更换文章路径。"});
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const date = new Date().toISOString().slice(0, 10);
    const extensionMap = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"};
    const coverPath = body.cover ? `assets/articles/${body.slug}-cover.${extensionMap[body.cover.type]}` : "";
    const [ref, insights, sitemap, llms, feed] = await Promise.all([
      githubRequest(`/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(BRANCH)}`),
      getRepoText("insights.html"),
      getRepoText("sitemap.xml"),
      getRepoText("llms.txt"),
      getRepoText("feed.xml")
    ]);
    const parentCommit = await githubRequest(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
    const articleHtml = renderArticle({...body, date, coverPath});
    const cardHtml = renderCard({...body, date, coverPath});
    const cardMarker = "<!-- AUTO_ARTICLE_CARDS -->";
    const sitemapMarker = "<!-- AUTO_ARTICLE_URLS -->";
    const llmsMarker = "<!-- AUTO_ARTICLE_LINKS -->";
    const feedMarker = "<!-- AUTO_FEED_ITEMS -->";
    if (!insights.includes(cardMarker) || !sitemap.includes(sitemapMarker) || !llms.includes(llmsMarker) || !feed.includes(feedMarker)) throw new Error("网站缺少自动发布标记，请先更新网站模板。 ");

    const cleanedInsights = insights.replace(/<!-- EMPTY_ARTICLES_START -->[\s\S]*?<!-- EMPTY_ARTICLES_END -->/, "");
    const updatedInsights = cleanedInsights.replace(cardMarker, `${cardMarker}\n        ${cardHtml}`);
    const sitemapEntry = `<url><loc>https://www.zhengtiantech.com/articles/${body.slug}.html</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    const updatedSitemap = sitemap.replace(sitemapMarker, `${sitemapMarker}\n  ${sitemapEntry}`);
    const updatedLlms = llms.replace(llmsMarker, `${llmsMarker}\n- [${body.title}](https://www.zhengtiantech.com/articles/${body.slug}.html)`);
    const updatedFeed = feed
      .replace(feedMarker, `${feedMarker}\n    ${renderFeedItem({...body, date})}`)
      .replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/, `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`);

    const [articleSha, insightsSha, sitemapSha, llmsSha, feedSha, coverSha] = await Promise.all([
      createBlob(articleHtml),
      createBlob(updatedInsights),
      createBlob(updatedSitemap),
      createBlob(updatedLlms),
      createBlob(updatedFeed),
      body.cover ? createBlob(body.cover.data, "base64") : Promise.resolve(null)
    ]);
    const treeItems = [
      {path: `articles/${body.slug}.html`, mode: "100644", type: "blob", sha: articleSha},
      {path: "insights.html", mode: "100644", type: "blob", sha: insightsSha},
      {path: "sitemap.xml", mode: "100644", type: "blob", sha: sitemapSha},
      {path: "llms.txt", mode: "100644", type: "blob", sha: llmsSha},
      {path: "feed.xml", mode: "100644", type: "blob", sha: feedSha}
    ];
    if (coverSha) treeItems.push({path: coverPath, mode: "100644", type: "blob", sha: coverSha});
    const tree = await githubRequest(`/repos/${OWNER}/${REPO}/git/trees`, {method: "POST", body: JSON.stringify({base_tree: parentCommit.tree.sha, tree: treeItems})});
    const commit = await githubRequest(`/repos/${OWNER}/${REPO}/git/commits`, {method: "POST", body: JSON.stringify({message: `publish article: ${body.title}`, tree: tree.sha, parents: [ref.object.sha]})});
    await githubRequest(`/repos/${OWNER}/${REPO}/git/refs/heads/${encodeURIComponent(BRANCH)}`, {method: "PATCH", body: JSON.stringify({sha: commit.sha, force: false})});

    return res.status(200).json({ok: true, url: `https://www.zhengtiantech.com/articles/${body.slug}.html`, commit: commit.html_url || `https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`});
  } catch (error) {
    console.error("Publish failed", error);
    return res.status(error.status === 409 ? 409 : 500).json({error: error.message || "发布失败，请稍后重试。"});
  }
};
