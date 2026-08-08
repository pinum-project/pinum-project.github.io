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
    /(@[A-Za-z_]\w*)/,                          // directives  @import, @for
    /\b(if|else|print|read|return|while|for|break|continue|switch)\b/, // keywords
    /\b(int|float|double|char|string|bool|long|short|signed|unsigned|vec)\b/, // types
    /\b(true|false|stdlib|math|engine)\b/,      // constants
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
      : groups[1] !== undefined ? "directive"
      : groups[2] !== undefined ? "keyword"
      : groups[3] !== undefined ? "type"
      : groups[4] !== undefined ? "constant"
      : groups[5] !== undefined || groups[6] !== undefined ? "string"
      : groups[7] !== undefined ? "number"
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
document.querySelectorAll("pre").forEach((pre) => {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.type = "button";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    const text = pre.querySelector("code").innerText;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied!";
    } catch {
      btn.textContent = "Failed";
    }
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });
  pre.parentElement.classList.add("codeblock");
  pre.parentElement.appendChild(btn);
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
