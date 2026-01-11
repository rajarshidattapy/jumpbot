import os
import json
from bs4 import BeautifulSoup

def inject_highlights(html_path, phrases):
    print(f"[Highlighter] Processing {len(phrases)} phrases.")
    
    if not os.path.exists(html_path):
        print(f"[Error] {html_path} not found")
        return None

    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    # 1. Inject the Mark.js library (Smart Highlighting Engine)
    # We use a CDN link so you don't need to download anything extra
    script_lib = soup.new_tag("script", src="https://cdnjs.cloudflare.com/ajax/libs/mark.js/8.11.1/mark.min.js")
    if soup.head:
        soup.head.append(script_lib)

    # 2. Inject CSS (Yellow background)
    style = soup.new_tag("style")
    style.string = "mark { background-color: #ffff00 !important; color: black !important; font-weight: bold; box-shadow: 0 0 5px #ffff00; }"
    if soup.head:
        soup.head.append(style)

    # 3. Inject the Script to Trigger Highlighting
    # We pass the phrases from Python to JavaScript here
    clean_phrases = [p.strip() for p in phrases if len(p) > 2]
    js_phrases = json.dumps(clean_phrases)
    
    script_act = soup.new_tag("script")
    script_act.string = f"""
        window.addEventListener('load', function() {{
            console.log("HIGHLIGHTER: Running Mark.js...");
            var instance = new Mark(document.body);
            instance.mark({js_phrases}, {{
                "element": "mark",
                "accuracy": "partially",
                "separateWordSearch": false,
                "acrossElements": true 
            }});
        }});
    """
    # Append the script to the end of the body so it runs last
    if soup.body:
        soup.body.append(script_act)

    # 4. Save as highlighted.html
    output_path = html_path.replace("mirror.html", "highlighted.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
    
    print(f"[Highlighter] Saved smart-highlighted file to {output_path}")
    return os.path.basename(output_path)