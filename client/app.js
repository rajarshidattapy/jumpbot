let currentURL = "";
const docsFrame = document.getElementById("docs-frame");

document.getElementById("load-btn").onclick = async () => {
  currentURL = document.getElementById("url-input").value;
  docsFrame.src = currentURL;

  await window.mcp.call("crawl_page", { url: currentURL });
  appendMsg("Indexed ✓");
};

document.getElementById("ask-btn").onclick = async () => {
  const q = document.getElementById("question-input").value;
  appendMsg(`You: ${q}`);

  const res = await window.mcp.call("query_page_tool", {
    url: currentURL,
    question: q
  });
  appendMsg(`JumpBot: ${res.answer}`);
  highlightSelector(res.selector);
};

function appendMsg(msg) {
  const box = document.getElementById("chat-window");
  box.innerHTML += `<div>${msg}</div>`;
  box.scrollTop = box.scrollHeight;
}

function highlightSelector(selector) {
  if (!selector) return;
  docsFrame.onload = () => runHighlight();
  runHighlight();
  function runHighlight() {
    const el = docsFrame.contentDocument.getElementById(selector);
    if (el) {
      el.classList.add("highlight");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el.classList.remove("highlight"), 3000);
    }
  }
}
