let currentURL = "";
const docsFrame = document.getElementById("docs-frame");
const chatWindow = document.getElementById("chat-window");
const ws = new WebSocket("ws://localhost:8765");

// ---- MCP call wrapper ----
function mcp(tool, args) {
  return new Promise(resolve => {
    ws.send(JSON.stringify({ tool, args }));
    ws.onmessage = (e) => resolve(JSON.parse(e.data));
  });
}

// ---- UI: Load docs + crawl ----
document.getElementById("load-btn").onclick = async () => {
  currentURL = document.getElementById("url-input").value.trim();
  if (!currentURL) return;

  appendMsg(`Loading: ${currentURL}`);
  docsFrame.src = currentURL;

  try {
    await mcp("crawl_page", { url: currentURL });
    appendMsg("Indexed ✓ (full docs site)");
  } catch (err) {
    appendMsg("❌ Error during indexing");
    console.error(err);
  }
};

// ---- UI: Ask question ----
document.getElementById("ask-btn").onclick = async () => {
  const q = document.getElementById("question-input").value.trim();
  if (!q) return;

  appendMsg(`You: ${q}`);

  try {
    const res = await mcp("query_page_tool", { url: currentURL, question: q });
    appendMsg(`JumpBot: ${res.answer}`);
    highlightSelector(res.selector);
  } catch (err) {
    appendMsg("❌ Error querying JumpBot");
    console.error(err);
  }
};

// ---- Chat window helper ----
function appendMsg(msg) {
  chatWindow.innerHTML += `<div>${msg}</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ---- Highlight & scroll to docs section ----
function highlightSelector(selector) {
  if (!selector) return;

  function run() {
    const doc = docsFrame.contentDocument;
    if (!doc) return;
    const el = doc.getElementById(selector);
    if (!el) return;

    el.classList.add("highlight");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => el.classList.remove("highlight"), 3000);
  }

  if (docsFrame.contentDocument?.readyState !== "complete") {
    docsFrame.onload = () => setTimeout(run, 350);
  } else {
    run();
  }
}

// ---- connect HTML to MCP ----
window.mcp = { call: mcp };
