function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDate(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderPosts(posts) {
  const list = document.getElementById("blog-list");
  if (!list) return;

  if (!Array.isArray(posts) || posts.length === 0) {
    list.innerHTML = `<div class="blog-empty">No blog posts found yet. Add markdown files in <code>blogs/</code>.</div>`;
    return;
  }

  list.innerHTML = posts
    .map((post) => {
      const tags = Array.isArray(post.tags)
        ? `<div class="blog-tags">${post.tags
            .map((tag) => `<span class="blog-tag">${escapeHtml(tag)}</span>`)
            .join("")}</div>`
        : "";

      return `
        <article class="blog-card">
          <h3>${escapeHtml(post.title)}</h3>
          <p class="blog-card-meta">${formatDate(post.date)}</p>
          <p>${escapeHtml(post.summary || "")}</p>
          ${tags}
          <a class="blog-card-link" href="blog-post.html?slug=${encodeURIComponent(post.slug)}">Read post</a>
        </article>
      `;
    })
    .join("");
}

fetch("blogs/index.json")
  .then((res) => {
    if (!res.ok) throw new Error("Unable to load blog index");
    return res.json();
  })
  .then((posts) => renderPosts(posts))
  .catch(() => {
    const list = document.getElementById("blog-list");
    if (list) {
      list.innerHTML =
        '<div class="blog-error">Failed to load blog index. Make sure <code>blogs/index.json</code> exists.</div>';
    }
  });
