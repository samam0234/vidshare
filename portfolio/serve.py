"""포트폴리오 사이트를 로컬에서 띄운다.

    python portfolio/serve.py           # http://localhost:4500
    python portfolio/serve.py 8080      # 포트 지정

정적 파일뿐이라 파일을 직접 열어도(file://) 대부분 보이지만,
경로·캐시 동작을 배포와 같게 맞추려면 이 서버로 여는 편이 낫다.
"""

from __future__ import annotations

import http.server
import sys
import webbrowser
from functools import partial
from pathlib import Path

SITE = Path(__file__).resolve().parent / "site"
DEFAULT_PORT = 4500


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
    }

    def end_headers(self) -> None:
        # 편집하면서 새로고침할 때 옛 파일이 잡히지 않게
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("  %s\n" % (fmt % args))

    def handle_one_request(self) -> None:
        # 브라우저가 연결을 먼저 끊는 것은 정상이다. 스택 트레이스를 찍지 않는다.
        try:
            super().handle_one_request()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            self.close_connection = True


def main() -> int:
    if not SITE.is_dir():
        print(f"사이트 폴더가 없다: {SITE}", file=sys.stderr)
        return 1

    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"포트는 숫자여야 한다: {sys.argv[1]}", file=sys.stderr)
            return 1

    # 스레드 서버라야 이미지가 많은 페이지에서 한 요청이 나머지를 막지 않는다
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    handler = partial(Handler, directory=str(SITE))

    try:
        with http.server.ThreadingHTTPServer(("", port), handler) as httpd:
            url = f"http://localhost:{port}/"
            print(f"VidShare 포트폴리오  →  {url}")
            print(f"  루트: {SITE}")
            print("  Ctrl+C 로 종료\n")
            webbrowser.open(url)
            httpd.serve_forever()
    except OSError as err:
        print(f"포트 {port} 를 열 수 없다: {err}", file=sys.stderr)
        print("다른 포트를 넘겨서 다시 실행: python portfolio/serve.py 4600", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\n종료")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
