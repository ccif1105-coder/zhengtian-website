from pathlib import Path


ROOT = Path(__file__).resolve().parent

pages = {
    "index.html": {
        "title": "政天科技｜企业AI搜索优化与GEO解决方案",
        "description": "政天科技帮助企业提升在DeepSeek、豆包、Kimi、腾讯元宝等AI平台中的品牌可见度、内容理解度与推荐概率。",
        "url": "https://example.com/",
    },
    "solutions.html": {
        "title": "解决方案｜政天科技GEO企业AI搜索优化服务",
        "description": "政天科技面向本地服务、B2B企业、品牌招商和专业服务行业，提供企业AI搜索优化与GEO内容建设方案。",
        "url": "https://example.com/solutions.html",
    },
    "cases.html": {
        "title": "案例场景｜企业AI搜索优化与GEO应用场景",
        "description": "了解企业在AI问答、品牌推荐、服务商对比和客户决策场景中如何通过GEO提升品牌AI可见度。",
        "url": "https://example.com/cases.html",
    },
    "about.html": {
        "title": "关于政天科技｜企业AI搜索优化与GEO服务公司",
        "description": "政天科技是一家专注企业AI搜索优化、GEO内容建设与AI可见度提升的科技服务公司。",
        "url": "https://example.com/about.html",
    },
}

schema = """<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "政天科技",
  "alternateName": "ZHENGTIAN TECHNOLOGY",
  "description": "政天科技是一家专注企业AI搜索优化、GEO内容建设与AI可见度提升的科技服务公司。",
  "url": "https://example.com/",
  "logo": "https://example.com/assets/logo-mark.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+86-13318755516",
    "contactType": "customer service",
    "areaServed": "CN",
    "availableLanguage": ["zh-CN"]
  },
  "sameAs": []
}
</script>"""


def build_meta(info):
    return f"""<title>{info["title"]}</title>
  <meta name="description" content="{info["description"]}">
  <link rel="canonical" href="{info["url"]}">
  <link rel="icon" type="image/png" href="./assets/favicon.png">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{info["title"]}">
  <meta property="og:description" content="{info["description"]}">
  <meta property="og:url" content="{info["url"]}">
  <meta property="og:image" content="https://example.com/assets/logo-mark.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{info["title"]}">
  <meta name="twitter:description" content="{info["description"]}">
  <meta name="twitter:image" content="https://example.com/assets/logo-mark.png">
  {schema}
  <link rel="stylesheet" href="./styles.css">"""


for name, info in pages.items():
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    start = text.index("  <title>")
    end_marker = '  <link rel="stylesheet" href="./styles.css">'
    end = text.index(end_marker, start) + len(end_marker)
    text = text[:start] + build_meta(info) + text[end:]
    path.write_text(text, encoding="utf-8")
    print(path)
