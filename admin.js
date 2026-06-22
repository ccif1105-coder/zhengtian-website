const form = document.querySelector("#article-editor");
const titleInput = document.querySelector("#article-title");
const summaryInput = document.querySelector("#article-summary");
const bodyInput = document.querySelector("#article-body");
const coverInput = document.querySelector("#article-cover");
const statusBox = document.querySelector("#publish-status");
const publishButton = document.querySelector("#publish-button");

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
    setStatus(`发布成功，网站正在自动更新：${result.url}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    publishButton.disabled = false;
  }
});

updateCounts();
