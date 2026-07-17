const header = document.querySelector(".site-header");

if (header) {
  window.addEventListener("scroll", () => {
    const active = window.scrollY > 18;
    header.style.background = active ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 255, 255, 0.92)";
  });
}

document.querySelectorAll("section, .feature-grid article, .matrix-grid article, .compare-grid article, .timeline div").forEach((el) => {
  el.classList.add("reveal");
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: "0px 0px -8% 0px" });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

const articleCatalog = document.querySelector(".knowledge-index");

if (articleCatalog) {
  const cards = Array.from(articleCatalog.querySelectorAll(".knowledge-card"));
  const search = articleCatalog.querySelector("#article-search");
  const topic = articleCatalog.querySelector("#article-topic");
  const region = articleCatalog.querySelector("#article-region");
  const count = articleCatalog.querySelector("#article-count");
  const loadMore = articleCatalog.querySelector("#article-load-more");
  const grid = articleCatalog.querySelector(".knowledge-grid");
  const regions = ["越秀", "海珠", "荔湾", "天河", "白云", "黄埔", "花都", "番禺", "南沙", "从化", "增城"];
  const pageSize = 9;
  let visibleLimit = pageSize;

  const addOption = (select, value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  };

  if (cards.length && search && topic && region && count && loadMore && grid) {
    const topics = [...new Set(cards.map((card) => card.querySelector(".knowledge-visual b")?.textContent.trim()).filter(Boolean))];
    topics.forEach((value) => addOption(topic, value));
    regions.filter((value) => cards.some((card) => card.textContent.includes(value))).forEach((value) => addOption(region, value));

    const empty = document.createElement("div");
    empty.className = "catalog-empty";
    empty.hidden = true;
    empty.innerHTML = "<b>没有找到相关文章</b><p>可以换一个关键词或筛选条件。</p>";
    grid.appendChild(empty);

    const renderCatalog = () => {
      const query = search.value.trim().toLowerCase();
      const selectedTopic = topic.value;
      const selectedRegion = region.value;
      const matches = cards.filter((card) => {
        const text = card.textContent.toLowerCase();
        const cardTopic = card.querySelector(".knowledge-visual b")?.textContent.trim() || "";
        return (!query || text.includes(query)) && (!selectedTopic || cardTopic === selectedTopic) && (!selectedRegion || text.includes(selectedRegion));
      });

      cards.forEach((card) => { card.hidden = true; });
      matches.slice(0, visibleLimit).forEach((card) => { card.hidden = false; });
      count.textContent = `共 ${matches.length} 篇`;
      empty.hidden = matches.length > 0;
      loadMore.hidden = matches.length <= visibleLimit;
    };

    [search, topic, region].forEach((control) => {
      control.addEventListener(control === search ? "input" : "change", () => {
        visibleLimit = pageSize;
        renderCatalog();
      });
    });

    loadMore.addEventListener("click", () => {
      visibleLimit += pageSize;
      renderCatalog();
    });

    renderCatalog();
  }
}

document.querySelectorAll(".solution-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.solution;
    document.querySelectorAll(".solution-tabs button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".solution-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === key);
    });
  });
});

document.querySelectorAll("[data-review-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.reviewFilter;
    document.querySelectorAll("[data-review-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    document.querySelectorAll("[data-review-type]").forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.reviewType !== filter;
    });
  });
});

document.querySelectorAll("[data-result-carousel]").forEach((carousel) => {
  const track = carousel.querySelector(".result-track");
  const cards = Array.from(carousel.querySelectorAll(".result-card"));
  const prev = carousel.querySelector("[data-result-prev]");
  const next = carousel.querySelector("[data-result-next]");
  const dotsWrap = carousel.querySelector("[data-result-dots]");
  if (!track || !cards.length || !prev || !next || !dotsWrap) return;

  let index = 0;
  let maxIndex = 0;

  const getVisibleCount = () => {
    if (window.matchMedia("(max-width: 640px)").matches) return 1;
    if (window.matchMedia("(max-width: 980px)").matches) return 2;
    return 3;
  };

  const updateCarousel = () => {
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const cardWidth = cards[0].getBoundingClientRect().width + gap;
    index = Math.max(0, Math.min(index, maxIndex));
    track.style.transform = `translateX(${-index * cardWidth}px)`;
    dotsWrap.querySelectorAll(".result-dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === index);
    });
    prev.disabled = index === 0;
    next.disabled = index === maxIndex;
  };

  const buildDots = () => {
    dotsWrap.innerHTML = "";
    for (let i = 0; i <= maxIndex; i += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "result-dot";
      dot.setAttribute("aria-label", `Show result group ${i + 1}`);
      dot.addEventListener("click", () => {
        index = i;
        updateCarousel();
      });
      dotsWrap.appendChild(dot);
    }
  };

  const refreshCarousel = () => {
    maxIndex = Math.max(0, cards.length - getVisibleCount());
    if (dotsWrap.children.length !== maxIndex + 1) buildDots();
    updateCarousel();
  };

  prev.addEventListener("click", () => {
    index -= 1;
    updateCarousel();
  });

  next.addEventListener("click", () => {
    index += 1;
    updateCarousel();
  });

  carousel.classList.add("is-ready");
  refreshCarousel();
  window.addEventListener("resize", refreshCarousel);
});

document.querySelectorAll(".result-media").forEach((button) => {
  const image = button.querySelector("img");
  const src = button.dataset.lightboxSrc || image?.getAttribute("src");
  if (src) button.style.setProperty("--preview-image", `url("${src}")`);
});

const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = lightbox?.querySelector("img");
const lightboxCaption = lightbox?.querySelector("[data-lightbox-caption]");
const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.classList.remove("no-scroll");
  if (lightboxImage) lightboxImage.src = "";
};

document.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const image = trigger.querySelector("img");
    if (!lightbox || !lightboxImage || image?.hidden) return;
    const title = trigger.dataset.lightboxTitle || image?.alt || "图片预览";
    lightboxImage.src = trigger.dataset.lightboxSrc;
    lightboxImage.alt = title;
    if (lightboxCaption) lightboxCaption.textContent = title;
    lightbox.hidden = false;
    document.body.classList.add("no-scroll");
  });
});

document.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});

document.querySelectorAll(".faq details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq details").forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

(() => {
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  const createId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const readStorage = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const writeStorage = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* Storage can be disabled. */ }
  };
  const visitorKey = "zt_analytics_visitor";
  const sessionKey = "zt_analytics_session";
  let visitorId = readStorage(visitorKey) || createId();
  writeStorage(visitorKey, visitorId);

  const now = Date.now();
  let session = {};
  try { session = JSON.parse(readStorage(sessionKey) || "{}"); } catch { session = {}; }
  if (!session.id || !session.lastSeen || now - session.lastSeen > 30 * 60 * 1000) session = {id: createId(), lastSeen: now};
  session.lastSeen = now;
  writeStorage(sessionKey, JSON.stringify(session));

  const params = new URLSearchParams(location.search);
  const referrerHost = (() => {
    try { return document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch { return ""; }
  })();
  const sourceFromHost = (host) => {
    if (!host) return "direct";
    if (/baidu/.test(host)) return "baidu";
    if (/bing/.test(host)) return "bing";
    if (/google/.test(host)) return "google";
    if (/weixin|wechat/.test(host)) return "wechat";
    if (/xiaohongshu/.test(host)) return "xiaohongshu";
    if (/zhihu/.test(host)) return "zhihu";
    if (/doubao/.test(host)) return "doubao";
    if (/deepseek/.test(host)) return "deepseek";
    if (/kimi|moonshot/.test(host)) return "kimi";
    if (/yuanbao/.test(host)) return "yuanbao";
    if (host === location.hostname.toLowerCase()) return "direct";
    return "other";
  };
  const rawSource = (params.get("utm_source") || "").toLowerCase();
  const knownSource = ["baidu", "bing", "google", "wechat", "weixin", "xiaohongshu", "zhihu", "doubao", "deepseek", "kimi", "yuanbao"].find((item) => rawSource.includes(item));
  const detectedSource = knownSource === "weixin" ? "wechat" : (knownSource || sourceFromHost(referrerHost));
  const source = session.source || detectedSource;
  session.source = source;
  writeStorage(sessionKey, JSON.stringify(session));
  const device = /ipad|tablet/i.test(navigator.userAgent) ? "tablet" : (/mobile|android|iphone/i.test(navigator.userAgent) ? "mobile" : "desktop");

  const track = (eventType, eventLabel = "") => {
    const payload = {
      eventType,
      eventLabel,
      visitorId,
      sessionId: session.id,
      pagePath: `${location.pathname}${location.hash}`.slice(0, 240),
      pageTitle: document.title,
      referrer: referrerHost,
      source,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      device,
      screen: `${window.screen.width}x${window.screen.height}`
    };
    fetch("/api/track", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "same-origin"
    }).catch(() => {});
  };

  track("page_view");

  document.addEventListener("click", (event) => {
    const target = event.target.closest("a, button");
    if (!target) return;
    const href = target.getAttribute("href") || "";
    const label = (target.textContent || target.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 120);
    if (href.startsWith("tel:")) return track("phone_click", label || href.replace("tel:", ""));
    if (target.matches("[data-lightbox-src]")) return track("case_image_view", label || "案例图片");
    if (/\/articles\/|articles\//.test(href)) return track("article_click", label || href);
    if (target.matches(".header-cta") || href.includes("#contact") || /诊断|演示|方案建议|预约沟通/.test(label)) {
      track("cta_click", label || href);
    }
  });

  const qrCard = document.querySelector(".qr-card");
  if (qrCard && "IntersectionObserver" in window) {
    const qrObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        track("qr_view", "联系二维码");
        qrObserver.disconnect();
      }
    }, {threshold: 0.7});
    qrObserver.observe(qrCard);
  }
})();
