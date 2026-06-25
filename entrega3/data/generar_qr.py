import qrcode
import os
from urllib.parse import quote

# ----------------------------------------------------------------------
# CONFIGURACIÓN: cambia esto por la URL real de su GitHub Pages
# ----------------------------------------------------------------------
# La Entrega 3 vive en una subcarpeta nueva del mismo repo de la Entrega 2,
# para no pisar la página de la E2 que sigue publicada en la raíz.
URL_BASE = "https://nacho200515.github.io/Visualizacion-factores-de-suicidio/entrega3/"

# IMPORTANTE: estos valores deben coincidir EXACTO con los que lee
# index.html (parámetro ?region=) desde la columna "Region" del CSV.
# Por eso "Norteamérica" no existe como tal: se llama "América"
# (incluye Canadá y EE.UU.).
CONTINENTES = {
    "Norteamerica": "América",        # nombre de archivo : valor real en el dataset
    "Latinoamerica": "Latinoamérica",
    "Europa": "Europa",
    "Asia": "Asia",
    "Africa": "África",
    "Oceania": "Oceanía",
}

CARPETA_SALIDA = "qr_continentes"

# ----------------------------------------------------------------------

os.makedirs(CARPETA_SALIDA, exist_ok=True)

print(f"Generando {len(CONTINENTES)} códigos QR (uno por continente)...")

for nombre_archivo, valor_region in CONTINENTES.items():
    url = f"{URL_BASE}?region={quote(valor_region)}"

    img = qrcode.make(url)
    ruta = os.path.join(CARPETA_SALIDA, f"{nombre_archivo}.png")
    img.save(ruta)

    print(f"  {nombre_archivo} -> {url}")

print(f"\nListo. QR guardados en la carpeta '{CARPETA_SALIDA}/'")
print("Imprímelos y pégalos sobre el continente correspondiente en el cartón piedra.")