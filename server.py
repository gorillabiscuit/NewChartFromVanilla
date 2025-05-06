from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import webbrowser
import os

class AutoReloadHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return SimpleHTTPRequestHandler.do_GET(self)

def run_server():
    PORT = 8000
    Handler = AutoReloadHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        webbrowser.open(f'http://localhost:{PORT}')
        httpd.serve_forever()

if __name__ == '__main__':
    run_server() 