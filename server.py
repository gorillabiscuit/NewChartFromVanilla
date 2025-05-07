from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver
import webbrowser
import os
import sys

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
    PORT = 3000
    Handler = AutoReloadHandler
    
    # Get the absolute path to the public directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(current_dir, 'dry-field-064a', 'public')
    
    # Verify the directory exists
    if not os.path.exists(public_dir):
        print(f"Error: Directory not found: {public_dir}")
        sys.exit(1)
    
    # Store original directory
    original_dir = os.getcwd()
    
    try:
        # Change to the public directory
        os.chdir(public_dir)
        print(f"Serving from: {public_dir}")
        
        # Try to create the server
        try:
            httpd = socketserver.TCPServer(("", PORT), Handler)
            print(f"Serving at http://localhost:{PORT}")
            webbrowser.open(f'http://localhost:{PORT}')
            httpd.serve_forever()
        except OSError as e:
            if e.errno == 48:  # Address already in use
                print(f"Error: Port {PORT} is already in use. Please try a different port or kill the existing process.")
            else:
                print(f"Error: {e}")
            os.chdir(original_dir)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        os.chdir(original_dir)
        sys.exit(1)
    finally:
        # Ensure we return to the original directory
        os.chdir(original_dir)

if __name__ == '__main__':
    run_server() 