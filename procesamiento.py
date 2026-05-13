import pandas as pd
import numpy as np
import os

# Crear carpeta data si no existe
os.makedirs("data", exist_ok=True)

# Cargar dataset original
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
    "adminregion": "Region",
    "incomeLevel": "IncomeLevel"
})

# Verificar que el rename funcionó
print("\nColumnas renombradas:")
for col in df.columns:
    print(repr(col))

# Columnas necesarias
columnas_necesarias = [
    "CountryName",
    "CountryCode",
    "CountryCode2",
    "Year",
    "HomicideRate",
    "SuicideRate",
    "GDP",
    "GDPPerCapitaPPP",
    "Region",
    "IncomeLevel"
]

# Revisar si falta alguna
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

# Eliminar filas sin país, año o código
df = df.dropna(subset=["CountryName", "CountryCode", "Year"])

# Quitar agregados del Banco Mundial si existen
df = df[df["IncomeLevel"] != "Aggregates"]

# Quedarse con filas donde existan ambas tasas
df = df.dropna(subset=["HomicideRate", "SuicideRate"])

# Elegir rango de años
df = df[(df["Year"] >= 2000) & (df["Year"] <= 2020)]

# Convertir año a entero
df["Year"] = df["Year"].astype(int)

# Crear diferencia
df["Difference"] = df["SuicideRate"] - df["HomicideRate"]

# Crear razón suicidio/homicidio
df["RatioSuicideHomicide"] = np.where(
    df["HomicideRate"] > 0,
    df["SuicideRate"] / df["HomicideRate"],
    np.nan
)

# Crear categoría comparativa
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

# Ordenar
df = df.sort_values(["Year", "CountryName"])

# Guardar archivo final
df.to_csv("data/datos_mapa_homicidio_suicidio.csv", index=False)

print("\nArchivo creado correctamente:")
print("data/datos_mapa_homicidio_suicidio.csv")

print("\nTamaño final:")
print(df.shape)

print("\nCantidad de países por año:")
print(df.groupby("Year")["CountryName"].count())

print("\nPrimeras filas:")
print(df.head())