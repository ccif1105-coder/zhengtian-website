const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  const active = window.scrollY > 18;
  header.style.background = active ? "rgba(5, 18, 55, 0.92)" : "rgba(5, 18, 55, 0.78)";
});

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
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

document.querySelectorAll(".solution-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.solution;
    document.querySelectorAll(".solution-tabs button").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".solution-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === key);
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
