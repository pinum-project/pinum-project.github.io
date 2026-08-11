// Mobile nav toggle
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
if (toggle && links) {
  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
  });
}

// --- PiNum syntax highlighting ---
const TOKEN_PATTERN = new RegExp(
  [
    /(#.*$)/,                                   // comments
    /\b(if|else|print|read|return|while|break|continue)\b/, // keywords
    /\b(int|float|double|char|string|bool|long|short|signed|unsigned)\b/, // types
    /\b(true|false)\b/,                         // constants
    /("(?:[^"\\\n]|\\.)*")/,                    // strings
    /('(?:[^'\\\n]|\\.)*')/,                    // chars
    /(\b\d+(?:\.\d+)?\b)/,                      // numbers
    /([+\-*\/%=&|^!<>?:~]+)/,                   // operators
  ]
    .map((r) => r.source)
    .join("|"),
  "gm"
);

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightPinum(code) {
  let html = "";
  let last = 0;
  let m;
  TOKEN_PATTERN.lastIndex = 0;
  while ((m = TOKEN_PATTERN.exec(code)) !== null) {
    html += escapeHtml(code.slice(last, m.index));
    const groups = m.slice(1);
    const cls =
      groups[0] !== undefined ? "comment"
      : groups[1] !== undefined ? "keyword"
      : groups[2] !== undefined ? "type"
      : groups[3] !== undefined ? "constant"
      : groups[4] !== undefined || groups[5] !== undefined ? "string"
      : groups[6] !== undefined ? "number"
      : "operator";
    html += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  html += escapeHtml(code.slice(last));
  return html;
}

document.querySelectorAll("code.language-pinum").forEach((block) => {
  block.innerHTML = highlightPinum(block.textContent);
});

// --- Copy buttons on code blocks ---
const COPY_ICON_URL = "assets/copy-icon.svg";
const COPY_ICON_FALLBACK = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25v-7.5Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25v-7.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5Z"></path></svg>';

const CHECK_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>';

const FAIL_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.06 1.06L9.06 8l3.22 3.22a.749.749 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>';

const copyIconPromise = fetch(COPY_ICON_URL)
  .then((res) => (res.ok ? res.text() : Promise.reject()))
  .catch(() => COPY_ICON_FALLBACK);

document.querySelectorAll("pre").forEach((pre) => {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Copy code");
  btn.innerHTML = COPY_ICON_FALLBACK;
  copyIconPromise.then((svg) => {
    if (svg) btn.innerHTML = svg;
  });
  btn.addEventListener("click", async () => {
    const text = pre.querySelector("code").innerText;
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = CHECK_ICON;
      btn.classList.add("copied");
    } catch {
      btn.innerHTML = FAIL_ICON;
      btn.classList.add("failed");
    }
    setTimeout(() => {
      btn.innerHTML = COPY_ICON_FALLBACK;
      btn.classList.remove("copied", "failed");
      copyIconPromise.then((svg) => {
        if (svg) btn.innerHTML = svg;
      });
    }, 1600);
  });
  pre.parentElement.classList.add("codeblock");
  pre.parentElement.appendChild(btn);
});

// --- Page loading feedback ---
const loader = document.querySelector(".page-loader");

document.querySelectorAll("a[href]").forEach((a) => {
  const href = a.getAttribute("href");
  const isInternal =
    href &&
    !href.startsWith("http") &&
    !href.startsWith("//") &&
    !href.startsWith("#") &&
    !href.startsWith("mailto:") &&
    !href.endsWith(".svg");
  if (!isInternal) return;
  a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (loader) loader.classList.add("active");
  });
});

// --- TOC scrollspy ---
const tocLinks = document.querySelectorAll(".toc a");
if (tocLinks.length) {
  const sections = [];
  tocLinks.forEach((a) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) sections.push({ link: a, el: target });
  });

  const onScroll = () => {
    const pos = window.scrollY + 120;
    let current = sections[0];
    for (const s of sections) {
      if (s.el.offsetTop <= pos) current = s;
    }
    if (current) {
      tocLinks.forEach((a) => a.classList.remove("active"));
      current.link.classList.add("active");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
