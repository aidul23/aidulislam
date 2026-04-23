function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "";
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { meta: {}, body: markdown };
  }

  const parts = markdown.split("\n");
  let i = 1;
  const metaLines = [];
  for (; i < parts.length; i += 1) {
    if (parts[i].trim() === "---") break;
    metaLines.push(parts[i]);
  }

  const meta = {};
  metaLines.forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const items = value
        .slice(1, -1)
        .split(",")
        .map((t) => t.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      meta[key] = items;
      return;
    }
    meta[key] = value;
  });

  const body = parts.slice(i + 1).join("\n");
  return { meta, body };
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

async function fetchMarkdownWithFallback(markdownPath) {
  const localRes = await fetch(markdownPath);
  if (localRes.ok) return localRes.text();

  // GitHub Pages fallback for cases where .md is not served directly.
  const host = window.location.hostname;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const owner = host.endsWith("github.io") ? host.split(".")[0] : "";
  const repo = pathParts.length > 0 ? pathParts[0] : "";
  const branch = "master";

  if (owner && repo) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${markdownPath}`;
    const rawRes = await fetch(rawUrl);
    if (rawRes.ok) return rawRes.text();
  }

  throw new Error("Post markdown not found");
}

function setShareLinks(title) {
  const shareUrl = window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title || "Blog Post");

  const linkedin = document.getElementById("share-linkedin");
  const facebook = document.getElementById("share-facebook");
  const twitter = document.getElementById("share-twitter");
  const copyBtn = document.getElementById("share-copy");

  if (linkedin) linkedin.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  if (facebook) facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  if (twitter) twitter.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copyBtn.classList.add("copied");
        copyBtn.title = "Copied";
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.title = "Copy link";
        }, 1200);
      } catch (_) {}
    });
  }
}

async function initPost() {
  const slug = getSlug();
  const wrapper = document.getElementById("blog-post");
  if (!wrapper) return;

  if (!slug) {
    wrapper.innerHTML = '<div class="blog-error">No post selected. Open a URL like <code>blog-post.html?slug=blog-1</code>.</div>';
    return;
  }

  try {
    const indexRes = await fetch("blogs/index.json");
    if (!indexRes.ok) throw new Error("Blog index not found");
    const posts = await indexRes.json();
    const postEntry = Array.isArray(posts) ? posts.find((p) => p.slug === slug) : null;
    if (!postEntry) throw new Error("Post not found");
    let body = postEntry.content || "";
    let title = postEntry.title || slug;
    let date = formatDate(postEntry.date);
    let summary = postEntry.summary || "";
    let tags = Array.isArray(postEntry.tags) ? postEntry.tags : [];

    // Backward compatibility for older index files without embedded content.
    if (!body) {
      const markdownPath = postEntry.file || `blogs/${slug}.md`;
      const markdown = await fetchMarkdownWithFallback(markdownPath);
      const parsed = parseFrontmatter(markdown);
      body = parsed.body;
      title = parsed.meta.title || title;
      date = formatDate(parsed.meta.date || postEntry.date);
      summary = parsed.meta.summary || summary;
      tags = Array.isArray(parsed.meta.tags) ? parsed.meta.tags : tags;
    }

    document.title = `${title} | Aidul Blog`;

    const tagsHtml = tags.length
      ? `<div class="blog-tags">${tags.map((tag) => `<span class="blog-tag">${tag}</span>`).join("")}</div>`
      : "";

    wrapper.innerHTML = `
      <article class="blog-post-card">
        <header class="blog-post-head">
          <h1>${title}</h1>
          <p class="blog-post-meta">${date}</p>
          ${summary ? `<p>${summary}</p>` : ""}
          ${tagsHtml}
        </header>
        <div class="blog-content">${window.marked.parse(body)}</div>
        <footer class="blog-share">
          <span class="blog-share-label">Share this post</span>
          <div class="blog-share-row">
            <a id="share-linkedin" class="blog-share-btn" target="_blank" rel="noopener" aria-label="Share on LinkedIn" title="Share on LinkedIn">
              <i class="uil uil-linkedin-alt"></i>
            </a>
            <a id="share-facebook" class="blog-share-btn" target="_blank" rel="noopener" aria-label="Share on Facebook" title="Share on Facebook">
              <i class="uil uil-facebook-f"></i>
            </a>
            <a id="share-twitter" class="blog-share-btn" target="_blank" rel="noopener" aria-label="Share on X/Twitter" title="Share on X/Twitter">
              <i class="uil uil-twitter"></i>
            </a>
            <button id="share-copy" class="blog-share-btn" type="button" aria-label="Copy post link" title="Copy link">
              <i class="uil uil-link"></i>
            </button>
          </div>
        </footer>
      </article>
    `;

    setShareLinks(title);
  } catch (e) {
    wrapper.innerHTML = `<div class="blog-error">${e.message}</div>`;
  }
}

initPost();
