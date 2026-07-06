const crypto = require("crypto");

const OWNER = process.env.GITHUB_OWNER || "ccif1105-coder";
const REPO = process.env.GITHUB_REPO || "zhengtian-website";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const API_ROOT = "https://api.github.com";
const CARD_MARKER = "<!-- AUTO_ARTICLE_CARDS -->";
const EMPTY_ARTICLES = `<!-- EMPTY_ARTICLES_START -->
        <div class="knowledge-empty"><b>文章正在整理中</b><p>这里将展示政天科技发布的品牌文章与行业观点。</p></div>
        <!-- EMPTY_ARTICLES_END -->`;

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const decodeHtml = (value = "") => String(value)
  .replace(/<br\s*\/?\s*>/gi, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
  .replace(/&quot;/g, '"')
  .replace(/&#039;|&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&amp;/g, "&");

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
      "User-Agent": "zhengtian-article-manager",
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

const commitChanges = async (message, changes) => {
  const ref = await githubRequest(`/repos/${OWNER}/${REPO}/git/ref/heads/${encodeURIComponent(BRANCH)}`);
  const parentCommit = await githubRequest(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
  const treeItems = await Promise.all(changes.map(async (change) => {
    if (change.delete) return {path: change.path, mode: "100644", type: "blob", sha: null};
    return {
      path: change.path,
      mode: "100644",
      type: "blob",
      sha: await createBlob(change.content, change.encoding || "utf-8")
    };
  }));
  const tree = await githubRequest(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({base_tree: parentCommit.tree.sha, tree: treeItems})
  });
  const commit = await githubRequest(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({message, tree: tree.sha, parents: [ref.object.sha]})
  });
  await githubRequest(`/repos/${OWNER}/${REPO}/git/refs/heads/${encodeURIComponent(BRANCH)}`, {
    method: "PATCH",
    body: JSON.stringify({sha: commit.sha, force: false})
  });
  return commit;
};

const validateSlug = (slug) => /^[a-z0-9-]{3,80}$/.test(slug || "");

const validateArticle = (body) => {
  const errors = [];
  if (!validateSlug(body.slug)) errors.push("文章路径无效。");
  if (!body.title || body.title.length < 6 || body.title.length > 80) errors.push("文章标题需要6至80个字符。");
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

const articleCardBlocks = (insights) => insights.match(/<article class="knowledge-card"[\s\S]*?<\/article>\s*/g) || [];

const findArticleCard = (insights, slug) => articleCardBlocks(insights)
  .find((card) => card.includes(`./articles/${slug}.html`));

const parseArticleList = (insights) => articleCardBlocks(insights).map((card) => {
  const slug = card.match(/href="\.\/articles\/([a-z0-9-]+)\.html"/)?.[1] || "";
  const title = decodeHtml(card.match(/<h2><a[^>]*>([\s\S]*?)<\/a><\/h2>/)?.[1] || "");
  const summary = decodeHtml(card.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/)?.[1] || "");
  const date = card.match(/<time datetime="([^"]+)"/)?.[1] || "";
  const readingTime = Number(card.match(/约\s*(\d+)\s*分钟/)?.[1] || 1);
  const coverPath = decodeHtml(card.match(/<div class="knowledge-visual has-cover"><img src="\.\/([^"]+)"/)?.[1] || "");
  return {slug, title, summary, date, readingTime, coverPath};
}).filter((article) => article.slug && article.title);

const parseArticleHtml = (html, slug) => {
  let schema = {};
  const schemaSource = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (schemaSource) {
    try { schema = JSON.parse(schemaSource); } catch { schema = {}; }
  }
  const bodySource = html.match(/<section class="article-body-content">([\s\S]*?)<\/section>/)?.[1] || "";
  const paragraphs = [...bodySource.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => decodeHtml(match[1]).trim()).filter(Boolean);
  const title = String(schema.headline || decodeHtml(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] || ""));
  const summary = String(schema.description || decodeHtml(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || ""));
  const keywords = Array.isArray(schema.keywords) ? schema.keywords.join(",") : String(schema.keywords || decodeHtml(html.match(/<meta name="keywords" content="([^"]*)"/)?.[1] || ""));
  const category = decodeHtml(html.match(/<p class="eyebrow">([\s\S]*?)<\/p>/)?.[1] || "品牌文章");
  const readingTime = Number(html.match(/阅读约(\d+)分钟/)?.[1] || 1);
  const coverPath = decodeHtml(html.match(/<figure class="article-cover"><img src="\.\.\/([^"]+)"/)?.[1] || "");
  const date = String(schema.datePublished || html.match(/<time datetime="([^"]+)"/)?.[1] || new Date().toISOString().slice(0, 10));
  return {slug, title, summary, keywords, category, readingTime, coverPath, date, body: paragraphs.join("\n\n")};
};

const renderArticle = ({title, slug, category, summary, keywords, readingTime, body, date, modifiedDate, coverPath}) => {
  category = category || "品牌文章";
  keywords = keywords || title;
  const absoluteUrl = `https://www.zhengtiantech.com/articles/${slug}.html`;
  const ogImage = coverPath ? `https://www.zhengtiantech.com/${coverPath}` : "https://www.zhengtiantech.com/assets/logo-mark.png";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": summary,
    "datePublished": date,
    "dateModified": modifiedDate || date,
    "inLanguage": "zh-CN",
    "keywords": keywords,
    "mainEntityOfPage": absoluteUrl,
    "image": ogImage,
    "author": {"@type": "Organization", "name": "政天科技"},
    "publisher": {"@type": "Organization", "name": "政天科技", "logo": {"@type": "ImageObject", "url": "https://www.zhengtiantech.com/assets/logo-mark.png"}}
  };
  const coverHtml = coverPath ? `<figure class="article-cover"><img src="../${escapeHtml(coverPath)}" alt="${escapeHtml(title)}"><figcaption>${escapeHtml(title)}</figcaption></figure>` : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}｜政天科技</title>
  <meta name="description" content="${escapeHtml(summary)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${absoluteUrl}"><link rel="sitemap" type="application/xml" href="https://www.zhengtiantech.com/sitemap.xml"><link rel="icon" type="image/png" href="../assets/favicon.png">
  <meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(summary)}"><meta property="og:url" content="${absoluteUrl}"><meta property="og:image" content="${ogImage}"><meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <header class="site-header"><a class="brand" href="../index.html" aria-label="政天科技首页"><img src="../assets/logo-mark.png" alt=""><span><strong>政天科技</strong><em>ZHENGTIAN TECHNOLOGY</em></span></a><nav class="nav" aria-label="主导航"><a href="../index.html">首页</a><a href="../solutions.html">解决方案</a><a href="../cases.html">案例场景</a><a href="../insights.html">政天智见</a><a href="../about.html">关于政天</a><a href="../index.html#faq">FAQ</a></nav><a class="header-cta" href="../index.html#contact">预约诊断</a></header>
  <main><article class="article-page" data-article-slug="${slug}">
    <nav class="breadcrumbs" aria-label="面包屑"><a href="../index.html">首页</a><span>/</span><a href="../insights.html">政天智见</a><span>/</span><b>${escapeHtml(category)}</b></nav>
    <header class="article-header"><p class="eyebrow">${escapeHtml(category)}</p><h1>${escapeHtml(title)}</h1><p class="article-deck">${escapeHtml(summary)}</p><div class="article-byline"><span>政天科技</span><time datetime="${date}">${date}</time><span>阅读约${readingTime}分钟</span></div></header>
    ${coverHtml}
    <div class="article-layout article-layout-simple"><div class="article-content"><section class="article-body-content">${paragraphsToHtml(body)}</section></div></div>
    <footer class="article-end"><p>返回文章页</p><a href="../insights.html">查看政天智见全部文章 →</a></footer>
  </article></main>
  <footer class="footer"><span>政天科技</span><span>政天智见 · 品牌内容中心</span></footer><script src="../script.js?v=20260706-analytics"></script>
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

const updateArticle = async (body) => {
  const errors = validateArticle(body);
  if (errors.length) {
    const error = new Error(errors[0]);
    error.status = 400;
    throw error;
  }
  const [articleHtml, insights, sitemap, llms] = await Promise.all([
    getRepoText(`articles/${body.slug}.html`),
    getRepoText("insights.html"),
    getRepoText("sitemap.xml"),
    getRepoText("llms.txt")
  ]);
  const current = parseArticleHtml(articleHtml, body.slug);
  const card = findArticleCard(insights, body.slug);
  if (!card) {
    const error = new Error("文章列表中没有找到这篇文章。");
    error.status = 404;
    throw error;
  }
  const extensionMap = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"};
  const coverPath = body.cover
    ? `assets/articles/${body.slug}-cover.${extensionMap[body.cover.type]}`
    : (body.removeCover ? "" : current.coverPath);
  const modifiedDate = new Date().toISOString().slice(0, 10);
  const updatedArticle = renderArticle({...body, date: current.date, modifiedDate, coverPath});
  const updatedCard = renderCard({...body, date: current.date, coverPath});
  const updatedInsights = insights.replace(card, `${updatedCard}\n        `);
  const escapedSlug = body.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sitemapPattern = new RegExp(`(<url><loc>https://www\\.zhengtiantech\\.com/articles/${escapedSlug}\\.html</loc><lastmod>)[^<]+`);
  const llmsPattern = new RegExp(`^- \\[[^\\n]*\\]\\(https://www\\.zhengtiantech\\.com/articles/${escapedSlug}\\.html\\)\\r?$`, "m");
  if (!sitemapPattern.test(sitemap) || !llmsPattern.test(llms)) {
    const error = new Error("文章索引信息不完整，请检查站点地图和AI抓取文件。");
    error.status = 409;
    throw error;
  }
  const updatedSitemap = sitemap.replace(sitemapPattern, `$1${modifiedDate}`);
  const updatedLlms = llms.replace(llmsPattern, `- [${body.title.replace(/[\[\]]/g, "")}](${`https://www.zhengtiantech.com/articles/${body.slug}.html`})`);
  const changes = [
    {path: `articles/${body.slug}.html`, content: updatedArticle},
    {path: "insights.html", content: updatedInsights},
    {path: "sitemap.xml", content: updatedSitemap},
    {path: "llms.txt", content: updatedLlms}
  ];
  if (body.cover) changes.push({path: coverPath, content: body.cover.data, encoding: "base64"});
  if (current.coverPath && current.coverPath !== coverPath) changes.push({path: current.coverPath, delete: true});
  const commit = await commitChanges(`update article: ${body.title}`, changes);
  return {commit, url: `https://www.zhengtiantech.com/articles/${body.slug}.html`};
};

const deleteArticle = async (slug, confirmTitle) => {
  if (!validateSlug(slug)) {
    const error = new Error("文章路径无效。");
    error.status = 400;
    throw error;
  }
  const [articleHtml, insights, sitemap, llms] = await Promise.all([
    getRepoText(`articles/${slug}.html`),
    getRepoText("insights.html"),
    getRepoText("sitemap.xml"),
    getRepoText("llms.txt")
  ]);
  const current = parseArticleHtml(articleHtml, slug);
  if (!confirmTitle || confirmTitle !== current.title) {
    const error = new Error("删除确认信息不匹配，请重新加载文章后再试。");
    error.status = 400;
    throw error;
  }
  const card = findArticleCard(insights, slug);
  if (!card) {
    const error = new Error("文章列表中没有找到这篇文章。");
    error.status = 404;
    throw error;
  }
  let updatedInsights = insights.replace(card, "");
  if (!articleCardBlocks(updatedInsights).length && !updatedInsights.includes("EMPTY_ARTICLES_START")) {
    updatedInsights = updatedInsights.replace(CARD_MARKER, `${CARD_MARKER}\n        ${EMPTY_ARTICLES}`);
  }
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sitemapPattern = new RegExp(`\\s*<url><loc>https://www\\.zhengtiantech\\.com/articles/${escapedSlug}\\.html</loc>[\\s\\S]*?</url>`);
  const llmsPattern = new RegExp(`\\n?- \\[[^\\n]*\\]\\(https://www\\.zhengtiantech\\.com/articles/${escapedSlug}\\.html\\)\\r?`, "m");
  if (!sitemapPattern.test(sitemap) || !llmsPattern.test(llms)) {
    const error = new Error("文章索引信息不完整，请检查站点地图和AI抓取文件。");
    error.status = 409;
    throw error;
  }
  const changes = [
    {path: `articles/${slug}.html`, delete: true},
    {path: "insights.html", content: updatedInsights},
    {path: "sitemap.xml", content: sitemap.replace(sitemapPattern, "")},
    {path: "llms.txt", content: llms.replace(llmsPattern, "")}
  ];
  if (current.coverPath) changes.push({path: current.coverPath, delete: true});
  const commit = await commitChanges(`delete article: ${current.title}`, changes);
  return {commit, title: current.title};
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
  if (!process.env.ADMIN_PASSWORD || !process.env.GITHUB_TOKEN) return res.status(503).json({error: "文章管理服务尚未配置。"});
  if (!constantTimeEqual(req.headers["x-admin-password"], process.env.ADMIN_PASSWORD)) return res.status(401).json({error: "管理密码错误。"});
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({error: "请求内容不是有效的JSON。"});
  }
  try {
    if (body.action === "list") {
      const insights = await getRepoText("insights.html");
      return res.status(200).json({ok: true, articles: parseArticleList(insights)});
    }
    if (body.action === "get") {
      if (!validateSlug(body.slug)) return res.status(400).json({error: "文章路径无效。"});
      const html = await getRepoText(`articles/${body.slug}.html`);
      return res.status(200).json({ok: true, article: parseArticleHtml(html, body.slug)});
    }
    if (body.action === "update") {
      const result = await updateArticle(body);
      return res.status(200).json({ok: true, url: result.url, commit: result.commit.html_url || result.commit.sha});
    }
    if (body.action === "delete") {
      const result = await deleteArticle(body.slug, body.confirmTitle);
      return res.status(200).json({ok: true, title: result.title, commit: result.commit.html_url || result.commit.sha});
    }
    return res.status(400).json({error: "不支持的管理操作。"});
  } catch (error) {
    console.error("Article management failed", error);
    const status = [400, 404, 409].includes(error.status) ? error.status : 500;
    return res.status(status).json({error: error.message || "操作失败，请稍后重试。"});
  }
};
