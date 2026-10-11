#!/usr/bin/env python3
"""Vocab Voyage server — 127.0.0.1:4303. Serves live page + /api/words."""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", 4303))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def page():
    words_path = os.path.join(HERE, "data", "words.json")
    if os.path.isfile(words_path):
        words_js = open(words_path, encoding="utf-8").read()
    else:
        words_js = "null"
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace("/*__WORDS__*/ null /*__/WORDS__*/", words_js)
    html = html.replace(
        "/*__APP__*/", rd("web/app.js").replace("</script", "<\\/script")
    )
    return html


class H(BaseHTTPRequestHandler):
    def send(self, code, body, ctype):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path = self.path.split("?")[0]
        try:
            if path in ("/", "/index.html", "/vocab-voyage.html"):
                self.send(200, page(), "text/html; charset=utf-8")
            elif path == "/api/words":
                p = os.path.join(HERE, "data", "words.json")
                if not os.path.isfile(p):
                    self.send(
                        404,
                        json.dumps({"error": "words.json missing"}),
                        "application/json",
                    )
                    return
                self.send(200, open(p, encoding="utf-8").read(), "application/json")
            elif path == "/health":
                self.send(
                    200,
                    json.dumps({"ok": True, "port": PORT, "app": "vocab-voyage"}),
                    "application/json",
                )
            else:
                self.send(404, "not found", "text/plain")
        except Exception as ex:
            self.send(500, f"error: {ex}", "text/plain")

    def log_message(self, fmt, *args):
        print(f"[vocab-voyage] {args[0]}")


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print(f"Vocab Voyage http://127.0.0.1:{PORT}/")
    httpd.serve_forever()
