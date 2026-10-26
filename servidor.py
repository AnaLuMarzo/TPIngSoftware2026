#!/usr/bin/env python3
"""Servidor simple para el TP de Autoridades de Mesa.

Sirve archivos estáticos y expone un endpoint POST /api/postulantes
para guardar inscripciones en data/postulantes.json.

Uso:
    python servidor.py [puerto]

Ejemplo:
    python servidor.py 8080
"""

import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse


DATA_DIR = "data"
POSTULANTES_FILE = os.path.join(DATA_DIR, "postulantes.json")


class Handler(SimpleHTTPRequestHandler):
    """Handler que sirve archivos estáticos y maneja inscripciones."""

    def do_GET(self):
        """Sirve archivos estáticos como antes."""
        super().do_GET()

    def do_POST(self):
        """Maneja peticiones POST para guardar postulantes."""
        parsed_path = urlparse(self.path)

        if parsed_path.path == "/api/postulantes":
            return self._guardar_postulante()

        # Si no es un endpoint conocido, servir normalmente
        super().do_GET()

    def _guardar_postulante(self):
        """Guarda un nuevo postulante en postulantes.json."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            postulante = json.loads(body)

            # Validar campos obligatorios
            campos_obligatorios = [
                "nombre", "dni", "fecha_nacimiento", "direccion",
                "telefono", "email", "distrito"
            ]
            for campo in campos_obligatorios:
                if not postulante.get(campo):
                    self._responder_json(400, {
                        "error": f"Falta el campo obligatorio: {campo}"
                    })
                    return

            # Cargar postulantes existentes
            postulantes = self._cargar_postulantes()

            # Verificar DNI duplicado
            for p in postulantes:
                if p["dni"] == postulante["dni"]:
                    self._responder_json(409, {
                        "error": f"Ya existe un postulante con DNI {postulante['dni']}"
                    })
                    return

            # Asignar ID automático
            max_id = max((p["id"] for p in postulantes), default=0)
            postulante["id"] = max_id + 1
            postulante["fecha_inscripcion"] = self._ahora_iso()

            # Guardar
            postulantes.append(postulante)
            self._guardar_archivo(postulantes)

            self._responder_json(201, {
                "mensaje": "Inscripción registrada correctamente",
                "postulante": postulante
            })

        except json.JSONDecodeError:
            self._responder_json(400, {"error": "JSON inválido"})
        except Exception as e:
            print(f"Error al guardar postulante: {e}", file=sys.stderr)
            self._responder_json(500, {"error": str(e)})

    def _cargar_postulantes(self):
        """Carga el array de postulantes desde el archivo."""
        if not os.path.exists(POSTULANTES_FILE):
            return []
        with open(POSTULANTES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []

    def _guardar_archivo(self, postulantes):
        """Escribe el array de postulantes en el archivo JSON."""
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(POSTULANTES_FILE, "w", encoding="utf-8") as f:
            json.dump(postulantes, f, ensure_ascii=False, indent=4)

    def _ahora_iso(self):
        """Retorna la fecha/hora actual en formato ISO 8601."""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    def _responder_json(self, codigo, datos):
        """Envía una respuesta JSON con el código HTTP indicado."""
        cuerpo = json.dumps(datos, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)


def main():
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    directorio = os.path.dirname(os.path.abspath(__file__)) or "."
    os.chdir(directorio)

    servidor = HTTPServer(("0.0.0.0", puerto), Handler)
    print(f"[INFO] Servidor corriendo en http://localhost:{puerto}")
    print(f"[INFO] Archivos estaticos desde: {directorio}")
    print(f"[INFO] Endpoint POST: http://localhost:{puerto}/api/postulantes")
    print("[INFO] Ctrl+C para detener\n")

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Servidor detenido.")
        servidor.server_close()


if __name__ == "__main__":
    main()
