#!/usr/bin/env python3
"""Inline web/ + data/words.json into one offline file: dist/vocab-voyage.html."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def main():
    words_path = os.path.join(HERE, "data", "words.json")
    with open(words_path, encoding="utf-8") as f:
        words = json.load(f)
    words_js = json.dumps(words, ensure_ascii=False)
    n = sum(len(p["words"]) for p in words.get("packs", []))
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace(
        "/*__WORDS__*/ null /*__/WORDS__*/",
        words_js,
    )
    app = rd("web/app.js").replace("</script", "<\\/script")
    html = html.replace("/*__APP__*/", app)
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    out = os.path.join(HERE, "dist", "vocab-voyage.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"built {out} ({os.path.getsize(out):,} bytes) · EXAMPLE words={n}")


if __name__ == "__main__":
    main()
