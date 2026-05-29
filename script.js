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

document.querySelectorAll(".faq details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq details").forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});
