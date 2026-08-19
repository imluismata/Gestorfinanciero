# Servidor estático SOLO para desarrollo: sirve la carpeta frontend/ y
# manda cabeceras "no-store" para que el navegador nunca cachee JS/CSS.
# Asi cada recarga toma la ultima version sin pelear con la cache.
# No es parte de la app; en produccion el frontend se sirve de otra forma.
import http.server
import os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend"))


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


http.server.HTTPServer(("", 5500), SinCache).serve_forever()
