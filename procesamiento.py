import pandas as pd
import numpy as np
import os


os.makedirs("data", exist_ok=True)


PAISES_EUROPA = {
    "ALB", "AND", "AUT", "BEL", "BGR", "BIH", "BLR", "CHE", "CYP", "CZE",
    "DEU", "DNK", "ESP", "EST", "FIN", "FRA", "GBR", "GRC", "HRV", "HUN",
    "IRL", "ISL", "ITA", "LTU", "LUX", "LVA", "MDA", "MKD", "MLT", "MNE",
    "NLD", "NOR", "POL", "PRT", "ROU", "RUS", "SRB", "SVK", "SVN", "SWE",
    "UKR", "XKX"
}

PAISES_ASIA = {
    "AFG", "ARE", "ARM", "AZE", "BGD", "BHR", "BRN", "BTN", "CHN", "GEO",
    "HKG", "IDN", "IND", "IRN", "IRQ", "ISR", "JOR", "JPN", "KAZ", "KGZ",
    "KHM", "KOR", "KWT", "LAO", "LBN", "LKA", "MAC", "MDV", "MMR", "MNG",
    "MYS", "NPL", "OMN", "PAK", "PHL", "PRK", "PSE", "QAT", "SAU", "SGP",
    "SYR", "THA", "TJK", "TKM", "TLS", "TUR", "TWN", "UZB", "VNM", "YEM"
}

PAISES_AFRICA = {
    "AGO", "BDI", "BEN", "BFA", "BWA", "CAF", "CIV", "CMR", "COD", "COG",
    "COM", "CPV", "DJI", "DZA", "EGY", "ERI", "ETH", "GAB", "GHA", "GIN",
    "GMB", "GNB", "GNQ", "KEN", "LBR", "LBY", "LSO", "MAR", "MDG", "MLI",
    "MOZ", "MRT", "MUS", "MWI", "NAM", "NER", "NGA", "RWA", "SDN", "SEN",
    "SLE", "SOM", "SSD", "STP", "SWZ", "SYC", "TCD", "TGO", "TUN", "TZA",
    "UGA", "ZAF", "ZMB", "ZWE"
}

PAISES_OCEANIA = {
    "AUS", "FJI", "FSM", "KIR", "MHL", "NRU", "NZL", "PLW", "PNG", "SLB",
    "TON", "TUV", "VUT", "WSM"
}

PAISES_LATINOAMERICA = {
    "ARG", "BOL", "BRA", "CHL", "COL", "CRI", "CUB", "DOM", "ECU", "GTM",
    "HND", "HTI", "MEX", "NIC", "PAN", "PER", "PRY", "SLV", "URY", "VEN",
    "BLZ", "GUY", "SUR", "JAM", "TTO", "BHS", "BRB", "GRD", "LCA", "VCT",
    "ATG", "DMA", "KNA"
}

PAISES_AMERICA = {
    "CAN", "USA"
}

NOMBRES_PAISES_ES = {
    # América
    "ARG": "Argentina",
    "BOL": "Bolivia",
    "BRA": "Brasil",
    "CAN": "Canadá",
    "CHL": "Chile",
    "COL": "Colombia",
    "CRI": "Costa Rica",
    "CUB": "Cuba",
    "DOM": "República Dominicana",
    "ECU": "Ecuador",
    "GTM": "Guatemala",
    "HND": "Honduras",
    "HTI": "Haití",
    "MEX": "México",
    "NIC": "Nicaragua",
    "PAN": "Panamá",
    "PER": "Perú",
    "PRY": "Paraguay",
    "SLV": "El Salvador",
    "URY": "Uruguay",
    "USA": "Estados Unidos",
    "VEN": "Venezuela",
    "BLZ": "Belice",
    "GUY": "Guyana",
    "SUR": "Surinam",
    "JAM": "Jamaica",
    "TTO": "Trinidad y Tobago",
    "BHS": "Bahamas",
    "BRB": "Barbados",
    "GRD": "Granada",
    "LCA": "Santa Lucía",
    "VCT": "San Vicente y las Granadinas",
    "ATG": "Antigua y Barbuda",
    "DMA": "Dominica",
    "KNA": "San Cristóbal y Nieves",

    # Europa
    "ALB": "Albania",
    "AND": "Andorra",
    "AUT": "Austria",
    "BEL": "Bélgica",
    "BGR": "Bulgaria",
    "BIH": "Bosnia y Herzegovina",
    "BLR": "Bielorrusia",
    "CHE": "Suiza",
    "CYP": "Chipre",
    "CZE": "Chequia",
    "DEU": "Alemania",
    "DNK": "Dinamarca",
    "ESP": "España",
    "EST": "Estonia",
    "FIN": "Finlandia",
    "FRA": "Francia",
    "GBR": "Reino Unido",
    "GRC": "Grecia",
    "HRV": "Croacia",
    "HUN": "Hungría",
    "IRL": "Irlanda",
    "ISL": "Islandia",
    "ITA": "Italia",
    "LTU": "Lituania",
    "LUX": "Luxemburgo",
    "LVA": "Letonia",
    "MDA": "Moldavia",
    "MKD": "Macedonia del Norte",
    "MLT": "Malta",
    "MNE": "Montenegro",
    "NLD": "Países Bajos",
    "NOR": "Noruega",
    "POL": "Polonia",
    "PRT": "Portugal",
    "ROU": "Rumania",
    "RUS": "Rusia",
    "SRB": "Serbia",
    "SVK": "Eslovaquia",
    "SVN": "Eslovenia",
    "SWE": "Suecia",
    "UKR": "Ucrania",
    "XKX": "Kosovo",

    # Asia
    "AFG": "Afganistán",
    "ARE": "Emiratos Árabes Unidos",
    "ARM": "Armenia",
    "AZE": "Azerbaiyán",
    "BGD": "Bangladés",
    "BHR": "Baréin",
    "BRN": "Brunéi",
    "BTN": "Bután",
    "CHN": "China",
    "GEO": "Georgia",
    "HKG": "Hong Kong",
    "IDN": "Indonesia",
    "IND": "India",
    "IRN": "Irán",
    "IRQ": "Irak",
    "ISR": "Israel",
    "JOR": "Jordania",
    "JPN": "Japón",
    "KAZ": "Kazajistán",
    "KGZ": "Kirguistán",
    "KHM": "Camboya",
    "KOR": "Corea del Sur",
    "KWT": "Kuwait",
    "LAO": "Laos",
    "LBN": "Líbano",
    "LKA": "Sri Lanka",
    "MAC": "Macao",
    "MDV": "Maldivas",
    "MMR": "Myanmar",
    "MNG": "Mongolia",
    "MYS": "Malasia",
    "NPL": "Nepal",
    "OMN": "Omán",
    "PAK": "Pakistán",
    "PHL": "Filipinas",
    "PRK": "Corea del Norte",
    "PSE": "Palestina",
    "QAT": "Catar",
    "SAU": "Arabia Saudita",
    "SGP": "Singapur",
    "SYR": "Siria",
    "THA": "Tailandia",
    "TJK": "Tayikistán",
    "TKM": "Turkmenistán",
    "TLS": "Timor Oriental",
    "TUR": "Turquía",
    "TWN": "Taiwán",
    "UZB": "Uzbekistán",
    "VNM": "Vietnam",
    "YEM": "Yemen",

    # África
    "AGO": "Angola",
    "BDI": "Burundi",
    "BEN": "Benín",
    "BFA": "Burkina Faso",
    "BWA": "Botsuana",
    "CAF": "República Centroafricana",
    "CIV": "Costa de Marfil",
    "CMR": "Camerún",
    "COD": "República Democrática del Congo",
    "COG": "República del Congo",
    "COM": "Comoras",
    "CPV": "Cabo Verde",
    "DJI": "Yibuti",
    "DZA": "Argelia",
    "EGY": "Egipto",
    "ERI": "Eritrea",
    "ETH": "Etiopía",
    "GAB": "Gabón",
    "GHA": "Ghana",
    "GIN": "Guinea",
    "GMB": "Gambia",
    "GNB": "Guinea-Bisáu",
    "GNQ": "Guinea Ecuatorial",
    "KEN": "Kenia",
    "LBR": "Liberia",
    "LBY": "Libia",
    "LSO": "Lesoto",
    "MAR": "Marruecos",
    "MDG": "Madagascar",
    "MLI": "Malí",
    "MOZ": "Mozambique",
    "MRT": "Mauritania",
    "MUS": "Mauricio",
    "MWI": "Malaui",
    "NAM": "Namibia",
    "NER": "Níger",
    "NGA": "Nigeria",
    "RWA": "Ruanda",
    "SDN": "Sudán",
    "SEN": "Senegal",
    "SLE": "Sierra Leona",
    "SOM": "Somalia",
    "SSD": "Sudán del Sur",
    "STP": "Santo Tomé y Príncipe",
    "SWZ": "Esuatini",
    "SYC": "Seychelles",
    "TCD": "Chad",
    "TGO": "Togo",
    "TUN": "Túnez",
    "TZA": "Tanzania",
    "UGA": "Uganda",
    "ZAF": "Sudáfrica",
    "ZMB": "Zambia",
    "ZWE": "Zimbabue",

    # Oceanía
    "AUS": "Australia",
    "FJI": "Fiyi",
    "FSM": "Micronesia",
    "KIR": "Kiribati",
    "MHL": "Islas Marshall",
    "NRU": "Nauru",
    "NZL": "Nueva Zelanda",
    "PLW": "Palaos",
    "PNG": "Papúa Nueva Guinea",
    "SLB": "Islas Salomón",
    "TON": "Tonga",
    "TUV": "Tuvalu",
    "VUT": "Vanuatu",
    "WSM": "Samoa"
}


def traducir_nombre_pais(codigo_pais, nombre_original):
    if pd.isna(codigo_pais):
        return nombre_original

    codigo = str(codigo_pais).strip().upper()

    if codigo in NOMBRES_PAISES_ES:
        return NOMBRES_PAISES_ES[codigo]

    return nombre_original



def asignar_region(codigo_pais):
    """
    Asigna una región limpia a partir del código ISO-3 del país.

    Nota:
    - Latinoamérica se deja separada porque es relevante para el proyecto.
    - Canadá y Estados Unidos quedan como América.
    - No se usa adminregion porque viene incompleta en algunos países.
    """
    if pd.isna(codigo_pais):
        return "Sin región"

    codigo = str(codigo_pais).strip().upper()

    if codigo in PAISES_LATINOAMERICA:
        return "Latinoamérica"

    if codigo in PAISES_AMERICA:
        return "América"

    if codigo in PAISES_EUROPA:
        return "Europa"

    if codigo in PAISES_ASIA:
        return "Asia"

    if codigo in PAISES_AFRICA:
        return "África"

    if codigo in PAISES_OCEANIA:
        return "Oceanía"

    return "Sin región"



df = pd.read_csv("homicidios_suicidios.csv", encoding="utf-8-sig")

# Limpiar nombres de columnas por si vienen con espacios raros
df.columns = df.columns.str.strip()

print("Columnas después de limpiar:")
for col in df.columns:
    print(repr(col))



# Renombrar columnas

df = df.rename(columns={
    "country": "CountryName",
    "iso3c": "CountryCode",
    "iso2c": "CountryCode2",
    "year": "Year",
    "Intentional homicides (per 100,000 people)": "HomicideRate",
    "Suicide mortality rate (per 100,000 population)": "SuicideRate",
    "GDP (current US$)": "GDP",
    "GDP per capita, PPP (current international $)": "GDPPerCapitaPPP",
    "adminregion": "RegionOriginal",
    "incomeLevel": "IncomeLevel"
})

print("\nColumnas renombradas:")
for col in df.columns:
    print(repr(col))


# Verificar columnas necesarias


columnas_necesarias = [
    "CountryName",
    "CountryCode",
    "CountryCode2",
    "Year",
    "HomicideRate",
    "SuicideRate",
    "GDP",
    "GDPPerCapitaPPP",
    "RegionOriginal",
    "IncomeLevel"
]

faltantes = [col for col in columnas_necesarias if col not in df.columns]

if faltantes:
    print("\nERROR: faltan estas columnas después de renombrar:")
    print(faltantes)
    print("\nColumnas disponibles:")
    print(df.columns.tolist())
    raise ValueError("Hay columnas que no coinciden con los nombres esperados.")



# Seleccionar columnas útiles

df = df[columnas_necesarias]


# Convertir columnas numéricas

df["Year"] = pd.to_numeric(df["Year"], errors="coerce")
df["HomicideRate"] = pd.to_numeric(df["HomicideRate"], errors="coerce")
df["SuicideRate"] = pd.to_numeric(df["SuicideRate"], errors="coerce")
df["GDP"] = pd.to_numeric(df["GDP"], errors="coerce")
df["GDPPerCapitaPPP"] = pd.to_numeric(df["GDPPerCapitaPPP"], errors="coerce")


# Limpieza básica

# Eliminar filas sin país, año o código
df = df.dropna(subset=["CountryName", "CountryCode", "Year"])

# Limpiar códigos de país
df["CountryCode"] = df["CountryCode"].astype(str).str.strip().str.upper()

# Guardar nombre original por trazabilidad
df["CountryNameOriginal"] = df["CountryName"]

# Traducir nombres de países usando código ISO-3
df["CountryName"] = df.apply(
    lambda row: traducir_nombre_pais(row["CountryCode"], row["CountryName"]),
    axis=1
)

df = df[df["IncomeLevel"] != "Aggregates"]

# Quedarse con filas donde existan ambas tasas
# No se rellenan tasas faltantes para no inventar datos.
df = df.dropna(subset=["HomicideRate", "SuicideRate"])

# Elegir rango de años
df = df[(df["Year"] >= 2000) & (df["Year"] <= 2020)]

# Convertir año a entero
df["Year"] = df["Year"].astype(int)



# Corregir región / continente

df["Region"] = df["CountryCode"].apply(asignar_region)

sin_region = df[df["Region"] == "Sin región"][["CountryName", "CountryCode"]].drop_duplicates()

if len(sin_region) > 0:
    print("\nPaíses sin región asignada:")
    print(sin_region.to_string(index=False))

df = df[df["Region"] != "Sin región"]



# Diferencia: positiva si suicidio > homicidio
df["Difference"] = df["SuicideRate"] - df["HomicideRate"]

# Razón suicidio / homicidio
df["RatioSuicideHomicide"] = np.where(
    df["HomicideRate"] > 0,
    df["SuicideRate"] / df["HomicideRate"],
    np.nan
)


def crear_categoria(row):
    suicidio = row["SuicideRate"]
    homicidio = row["HomicideRate"]

    if suicidio >= homicidio * 1.2:
        return "Suicidio mayor"
    elif homicidio >= suicidio * 1.2:
        return "Homicidio mayor"
    else:
        return "Tasas similares"


df["ComparisonCategory"] = df.apply(crear_categoria, axis=1)


# Ordenar y guardar

df = df.sort_values(["Year", "CountryName"])

columnas_finales = [
    "CountryName",
    "CountryNameOriginal",
    "CountryCode",
    "CountryCode2",
    "Year",
    "HomicideRate",
    "SuicideRate",
    "Difference",
    "RatioSuicideHomicide",
    "ComparisonCategory",
    "Region",
    "RegionOriginal",
    "IncomeLevel",
    "GDP",
    "GDPPerCapitaPPP"
]

df = df[columnas_finales]

df.to_csv("data/datos_mapa_homicidio_suicidio.csv", index=False, encoding="utf-8-sig")
