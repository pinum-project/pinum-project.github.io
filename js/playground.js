// PiNum in-browser playground.
// Pipeline: pinum.wasm (transpile .pn -> C) -> browsercc (C -> WASI wasm) -> run with the WASI shim.
import {
  WASI,
  File,
  OpenFile,
  PreopenDirectory,
  ConsoleStdout,
} from "../assets/wasm/shims/index.js";

const $ = (id) => document.getElementById(id);

const codeEl = $("pg-code");
const hlPre = $("pg-hl");
const hlEl = hlPre.querySelector("code");
const outputEl = $("pg-output-code");
const statusEl = $("pg-status");
const runBtn = $("pg-run");
const stdinEl = $("pg-stdin");

const BROWSERCC_URL = "https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js";
const PINUM_WASM_URL = "assets/wasm/pinum.wasm";
const RUNTIME_HDR_URL = "assets/wasm/pinum_runtime.h";

// --- Example programs ---
const EXAMPLES = {
  hello: `string name = "world"
print("Hello, ", name, "!\\n")

int a = 10
int b = 3
print(a + b, "\\n")`,
  fizzbuzz: `for (int i = 1; i <= 15; i++) {
  if (i % 15 == 0) {
    print("FizzBuzz", "\\n")
  } else if (i % 3 == 0) {
    print("Fizz", "\\n")
  } else if (i % 5 == 0) {
    print("Buzz", "\\n")
  } else {
    print(i, "\\n")
  }
}`,
  loops: `# compose shapes with string repetition
int row = 0
while (row < 4) {
  print('*' * (row * 2 + 1), "\\n")
  row = row + 1
}

# for loop with break and continue
for (int i = 1; i <= 10; i++) {
  if (i == 3) {
    continue
  }
  if (i == 8) {
    break
  }
  print(i, " ")
}
print("\\n")`,
};

// --- Syntax-highlighting editor overlay ---
function syncHighlight() {
  const code = codeEl.value;
  hlEl.innerHTML = (code ? window.highlightPinum(code) : "") + "\n";
}

codeEl.addEventListener("input", syncHighlight);
codeEl.addEventListener("scroll", () => {
  hlPre.scrollTop = codeEl.scrollTop;
  hlPre.scrollLeft = codeEl.scrollLeft;
});
hlPre.addEventListener("scroll", () => {
  codeEl.scrollTop = hlPre.scrollTop;
  codeEl.scrollLeft = hlPre.scrollLeft;
});

document.querySelectorAll(".pg-preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    codeEl.value = EXAMPLES[btn.dataset.example] || "";
    syncHighlight();
  });
});

// --- Resizable panes ---
const resizer = document.getElementById("pg-resizer");
const inputPane = document.getElementById("pg-pane-input");
const outputPane = document.getElementById("pg-pane-output");
let dragging = false;

resizer.addEventListener("pointerdown", (e) => {
  dragging = true;
  resizer.setPointerCapture(e.pointerId);
  resizer.classList.add("dragging");
  document.body.classList.add("pg-resizing");
  e.preventDefault();
});

resizer.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const grid = resizer.parentElement.getBoundingClientRect();
  const pct = Math.max(20, Math.min(80, ((e.clientX - grid.left) / grid.width) * 100));
  inputPane.style.flex = `1 1 ${pct}%`;
  outputPane.style.flex = `1 1 ${100 - pct}%`;
});

const stopDragging = () => {
  if (!dragging) return;
  dragging = false;
  resizer.classList.remove("dragging");
  document.body.classList.remove("pg-resizing");
};

resizer.addEventListener("pointerup", stopDragging);
resizer.addEventListener("pointercancel", stopDragging);

// --- WASI helpers ---
function textIn(str) {
  return new OpenFile(new File(new TextEncoder().encode(str)));
}

function runWasi(source, args, files, stdinStr = "") {
  // `source` may be raw wasm bytes (pinum.wasm) or a WebAssembly.Module (from browsercc).
  const memory = source instanceof WebAssembly.Module ? source : new WebAssembly.Module(source);
  let stdout = "";
  let stderr = "";
  const wasi = new WASI(args, [], [
    textIn(stdinStr),
    new ConsoleStdout((d) => (stdout += new TextDecoder().decode(d))),
    new ConsoleStdout((d) => (stderr += new TextDecoder().decode(d))),
    ...files,
  ], { debug: false });
  const instance = new WebAssembly.Instance(memory, { wasi_snapshot_preview1: wasi.wasiImport });
  // start() returns the exit code and only throws on real runtime traps.
  wasi.start(instance);
  return { stdout, stderr };
}

// --- Pipeline state ---
let pinumBytes = null;
let runtimeHeader = null;
let browserccCompile = null;

async function loadPinum() {
  if (!pinumBytes) {
    pinumBytes = await fetch(PINUM_WASM_URL).then((r) => r.arrayBuffer());
  }
}

async function loadHeader() {
  if (!runtimeHeader) {
    runtimeHeader = await fetch(RUNTIME_HDR_URL).then((r) => r.text());
  }
}

async function loadBrowsercc() {
  if (!browserccCompile) {
    const mod = await import(BROWSERCC_URL);
    browserccCompile = mod.compile;
  }
}

// --- Pipeline steps ---
async function transpile(source) {
  // pinum.wasm writes out.c into the mounted directory.
  const preopen = new PreopenDirectory(".", new Map([
    ["code.pn", new File(new TextEncoder().encode(source))],
  ]));
  const result = runWasi(pinumBytes, ["pinum", "-o", "out.c", "code.pn"], [preopen]);
  const outC = preopen.dir.contents.get("out.c");
  if (!outC) {
    throw new Error("Transpile failed:\n" + (result.stderr || result.stdout || "unknown error"));
  }
  return new TextDecoder().decode(outC.data);
}

function embedHeader(cSource) {
  // The transpiled C has `#include "pinum_runtime.h"`; prepend the header inline instead.
  const stripped = cSource.replace(/^#include\s+"[^"]*pinum_runtime\.h".*\n?/m, "");
  return runtimeHeader + "\n" + stripped;
}

async function compileC(cSource) {
  const { module, compileOutput } = await browserccCompile({
    source: embedHeader(cSource),
    fileName: "main.c",
    flags: ["-O2"],
  });
  if (!module) {
    throw new Error("Compilation failed:\n" + (compileOutput || "no output"));
  }
  return module;
}

async function runProgram(module) {
  const stdin = stdinEl.value || "";
  return runWasi(module, ["main"], [], stdin);
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function printOutput(text, isError) {
  outputEl.textContent = text;
  outputEl.parentElement.classList.toggle("pg-output-error", !!isError);
}

// --- Run ---
let running = false;

runBtn.addEventListener("click", async () => {
  if (running) return;
  running = true;
  const label = runBtn.querySelector(".pg-run-label");
  const original = label.textContent;
  label.textContent = "Running…";
  printOutput("", false);
  try {
    setStatus("Loading PiNum…");
    await loadPinum();

    setStatus("Transpiling to C…");
    const cSource = await transpile(codeEl.value);

    setStatus("Loading C compiler (first run only)…");
    await Promise.all([loadBrowsercc(), loadHeader()]);

    setStatus("Compiling to WebAssembly…");
    const module = await compileC(cSource);

    setStatus("Running…");
    const { stdout, stderr } = await runProgram(module);

    setStatus("Done");
    printOutput((stdout + stderr).trim() || "(no output)");
  } catch (err) {
    console.error(err);
    setStatus("Error");
    printOutput(err.message, true);
  } finally {
    label.textContent = original;
    running = false;
  }
});

// --- Init ---
codeEl.value = EXAMPLES.hello;
syncHighlight();