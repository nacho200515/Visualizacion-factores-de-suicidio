let datos = [];
let anioActual = 2018;
let paisResaltado = null;
let paisFijado = false;

let sonidoActivado = false;
let audioHomicidio = null;
let audioSuicidio = null;
let audioSimilar = null;
let synthYear = null;
let paisSonando = null;

let regionActual = "Todas";
let categoriaActual = "Todas";
let paisSelectorActual = "Todos";

const COLOR_SUICIDIO = "#CC79A7";
const COLOR_SUICIDIO_ACTIVO = "#8F3F6D";
const COLOR_HOMICIDIO = "#0072B2";
const COLOR_HOMICIDIO_ACTIVO = "#004C7A";
const COLOR_SIMILAR = "#999999";
const COLOR_SIMILAR_ACTIVO = "#4B5563";
const COLOR_BORDE_ACTIVO = "#111827";

const aniosDisponibles = [
    2000, 2001, 2002, 2003, 2004,
    2005, 2006, 2007, 2008, 2009,
    2010, 2011, 2012, 2013, 2014,
    2015, 2016, 2017, 2018
];

d3.csv("data/datos_mapa_homicidio_suicidio.csv").then(function(filas) {

    datos = filas
        .map(d => {
            const homicidios = Number(d.HomicideRate);
            const suicidios = Number(d.SuicideRate);

            const diferencia = !isNaN(Number(d.Difference))
                ? Number(d.Difference)
                : suicidios - homicidios;

            const razon = !isNaN(Number(d.RatioSuicideHomicide))
                ? Number(d.RatioSuicideHomicide)
                : (homicidios > 0 ? suicidios / homicidios : null);

            return {
                CountryName: d.CountryName,
                CountryCode: d.CountryCode,
                CountryCode2: d.CountryCode2,
                Year: Number(d.Year),
                HomicideRate: homicidios,
                SuicideRate: suicidios,
                Difference: diferencia,
                RatioSuicideHomicide: razon,
                ComparisonCategory: d.ComparisonCategory || obtenerCategoriaComparativa(homicidios, suicidios),
                Region: d.Region,
                RegionOriginal: d.RegionOriginal,
                IncomeLevel: d.IncomeLevel,
                GDP: Number(d.GDP),
                GDPPerCapitaPPP: Number(d.GDPPerCapitaPPP)
            };
        })
        .filter(d =>
            d.CountryName &&
            d.CountryCode &&
            d.Region &&
            !isNaN(d.Year) &&
            !isNaN(d.HomicideRate) &&
            !isNaN(d.SuicideRate)
        );

    const yearLabel = document.getElementById("yearLabel");
    const btnSonido = document.getElementById("btnSonido");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const filtroRegion = document.getElementById("filtroRegion");
    const filtroCategoria = document.getElementById("filtroCategoria");
    const filtroPais = document.getElementById("filtroPais");

    crearLineaTemporal();
    cargarOpcionesRegion();

    filtroRegion.addEventListener("change", function () {
        regionActual = filtroRegion.value;
        paisSelectorActual = "Todos";
        paisResaltado = null;
        paisFijado = false;
        detenerSonidoHover();
        limpiarPanelPais();
        dibujarVisualizacion(anioActual);
    });

    filtroCategoria.addEventListener("change", function () {
        categoriaActual = filtroCategoria.value;
        paisSelectorActual = "Todos";
        paisResaltado = null;
        paisFijado = false;
        detenerSonidoHover();
        limpiarPanelPais();
        dibujarVisualizacion(anioActual);
    });

    filtroPais.addEventListener("change", function () {
        paisSelectorActual = filtroPais.value;

        if (paisSelectorActual === "Todos") {
            paisResaltado = null;
            paisFijado = false;
            limpiarPanelPais();
            dibujarVisualizacion(anioActual);
            return;
        }

        seleccionarPaisPorCodigo(paisSelectorActual);
    });

    btnLimpiar.addEventListener("click", function () {
        paisSelectorActual = "Todos";
        paisResaltado = null;
        paisFijado = false;
        detenerSonidoHover();
        limpiarPanelPais();
        dibujarVisualizacion(anioActual);
    });

    btnSonido.addEventListener("click", async function () {
        if (!sonidoActivado) {
            await Tone.start();

            sonidoActivado = true;

            audioHomicidio = new Audio("data/audio/homicidio.mp3");
            audioSuicidio = new Audio("data/audio/suicidio.mp3");
            audioSimilar = new Audio("data/audio/similar.mp3");

            audioHomicidio.preload = "auto";
            audioSuicidio.preload = "auto";
            audioSimilar.preload = "auto";

            synthYear = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.02,
                    decay: 0.08,
                    sustain: 0.05,
                    release: 0.12
                },
                volume: -20
            }).toDestination();

            btnSonido.textContent = "Desactivar audio";
            btnSonido.classList.remove("btn-primary");
            btnSonido.classList.add("btn-success");

        } else {
            sonidoActivado = false;
            detenerSonidoHover();
            detenerAudios();

            audioHomicidio = null;
            audioSuicidio = null;
            audioSimilar = null;

            if (synthYear !== null) {
                synthYear.dispose();
                synthYear = null;
            }

            btnSonido.textContent = "Activar audio";
            btnSonido.classList.remove("btn-success");
            btnSonido.classList.add("btn-primary");
        }
    });

    anioActual = obtenerAnioInicial();
    yearLabel.textContent = anioActual;

    actualizarLineaTemporal();
    dibujarVisualizacion(anioActual);

}).catch(function(error) {
    console.error("Error al cargar el CSV:", error);

    const resumen = document.getElementById("resumenAnio");
    if (resumen) {
        resumen.innerHTML = `
            No se pudieron cargar los datos. Revisa que el archivo 
            <strong>data/datos_mapa_homicidio_suicidio.csv</strong> esté incluido correctamente.
        `;
    }
});

function obtenerAnioInicial() {
    if (datos.some(d => d.Year === 2020)) {
        return 2020;
    }

    if (datos.some(d => d.Year === 2018)) {
        return 2018;
    }

    const anios = Array.from(new Set(datos.map(d => d.Year))).sort((a, b) => b - a);
    return anios.length > 0 ? anios[0] : 2018;
}

function crearLineaTemporal() {
    const contenedor = document.getElementById("yearTimeline");
    contenedor.innerHTML = "";

    aniosDisponibles.forEach(anio => {
        const wrapper = document.createElement("div");
        wrapper.className = "year-dot-wrapper";
        wrapper.dataset.year = anio;

        const dot = document.createElement("button");
        dot.className = "year-dot";
        dot.setAttribute("aria-label", `Seleccionar año ${anio}`);
        dot.type = "button";

        const label = document.createElement("span");
        label.className = "year-label";
        label.textContent = anio;

        dot.addEventListener("click", function () {
            cambiarAnio(anio);
        });

        wrapper.appendChild(dot);
        wrapper.appendChild(label);
        contenedor.appendChild(wrapper);
    });
}

function cargarOpcionesRegion() {
    const filtroRegion = document.getElementById("filtroRegion");
    filtroRegion.innerHTML = "";

    const opcionTodas = document.createElement("option");
    opcionTodas.value = "Todas";
    opcionTodas.textContent = "Todas las regiones";
    filtroRegion.appendChild(opcionTodas);

    const ordenPreferido = [
        "África",
        "América",
        "Asia",
        "Europa",
        "Latinoamérica",
        "Oceanía"
    ];

    const regionesEnDatos = Array.from(
        new Set(datos.map(d => d.Region).filter(Boolean))
    );

    const regionesOrdenadas = ordenPreferido
        .filter(region => regionesEnDatos.includes(region))
        .concat(
            regionesEnDatos
                .filter(region => !ordenPreferido.includes(region) && region !== "Sin región")
                .sort((a, b) => a.localeCompare(b, "es"))
        );

    regionesOrdenadas.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        filtroRegion.appendChild(option);
    });
}

function cambiarAnio(nuevoAnio) {
    if (nuevoAnio === anioActual) {
        return;
    }

    anioActual = nuevoAnio;
    document.getElementById("yearLabel").textContent = anioActual;

    paisSelectorActual = "Todos";
    paisResaltado = null;
    paisFijado = false;

    actualizarLineaTemporal();
    reproducirSonidoCambioAnio(anioActual);
    limpiarPanelPais();
    dibujarVisualizacion(anioActual);
}

function actualizarLineaTemporal() {
    const wrappers = document.querySelectorAll(".year-dot-wrapper");

    wrappers.forEach(wrapper => {
        const anio = Number(wrapper.dataset.year);

        if (anio === anioActual) {
            wrapper.classList.add("active");
            wrapper.querySelector(".year-dot").classList.add("active");
        } else {
            wrapper.classList.remove("active");
            wrapper.querySelector(".year-dot").classList.remove("active");
        }
    });
}

function dibujarVisualizacion(anio) {
    const datosFiltrados = obtenerDatosFiltrados(anio);

    actualizarOpcionesPais(datosFiltrados);
    actualizarResumen(anio, datosFiltrados);
    actualizarInsights(anio, datosFiltrados);
    dibujarScatterComparacion(datosFiltrados);
    dibujarMapaDiferencia(datosFiltrados);
}

function obtenerDatosFiltrados(anio) {
    return datos.filter(d => {
        const coincideAnio = d.Year === anio;
        const coincideRegion = regionActual === "Todas" || d.Region === regionActual;
        const coincideCategoria = categoriaActual === "Todas" || d.ComparisonCategory === categoriaActual;

        return coincideAnio && coincideRegion && coincideCategoria;
    });
}

function obtenerDatosRegionBaseMapa(anio) {
    if (regionActual === "Todas") {
        return [];
    }

    return datos.filter(d =>
        d.Year === anio &&
        d.Region === regionActual
    );
}

function actualizarOpcionesPais(datosAnio) {
    const filtroPais = document.getElementById("filtroPais");

    if (!filtroPais) {
        return;
    }

    const paisesUnicos = new Map();

    datosAnio.forEach(d => {
        if (!paisesUnicos.has(d.CountryCode)) {
            paisesUnicos.set(d.CountryCode, d.CountryName);
        }
    });

    const paises = Array.from(paisesUnicos.entries())
        .map(([codigo, nombre]) => ({ codigo, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

    filtroPais.innerHTML = "";

    const opcionBase = document.createElement("option");
    opcionBase.value = "Todos";
    opcionBase.textContent = "Selecciona un país";
    filtroPais.appendChild(opcionBase);

    paises.forEach(pais => {
        const option = document.createElement("option");
        option.value = pais.codigo;
        option.textContent = pais.nombre;
        filtroPais.appendChild(option);
    });

    const existePaisActual = paises.some(pais => pais.codigo === paisSelectorActual);

    if (existePaisActual) {
        filtroPais.value = paisSelectorActual;
    } else {
        filtroPais.value = "Todos";
    }
}

function seleccionarPaisPorCodigo(codigoPais) {
    const datosFiltrados = obtenerDatosFiltrados(anioActual);
    const datoPais = datosFiltrados.find(d => d.CountryCode === codigoPais);

    if (!datoPais) {
        paisSelectorActual = "Todos";
        paisResaltado = null;
        paisFijado = false;
        limpiarPanelPais();
        dibujarVisualizacion(anioActual);
        return;
    }

    paisSelectorActual = codigoPais;
    paisResaltado = codigoPais;
    paisFijado = true;

    const infoPais = crearCustomData([datoPais])[0];

    mostrarComparacionPais(infoPais, "click");
    dibujarVisualizacion(anioActual);

    if (sonidoActivado) {
        reproducirSonificacion(datoPais.HomicideRate, datoPais.SuicideRate);
    }
}

function actualizarResumen(anio, datosAnio) {
    const totalPaises = datosAnio.length;
    const paisesSuicidioMayor = datosAnio.filter(d => d.ComparisonCategory === "Suicidio mayor").length;
    const paisesHomicidioMayor = datosAnio.filter(d => d.ComparisonCategory === "Homicidio mayor").length;
    const paisesSimilares = datosAnio.filter(d => d.ComparisonCategory === "Tasas similares").length;

    const porcentajeSuicidio = totalPaises > 0
        ? (paisesSuicidioMayor / totalPaises * 100).toFixed(1)
        : 0;

    const porcentajeHomicidio = totalPaises > 0
        ? (paisesHomicidioMayor / totalPaises * 100).toFixed(1)
        : 0;

    const nombreRegion = regionActual === "Todas"
        ? "todas las regiones"
        : regionActual;

    document.getElementById("resumenAnio").innerHTML = `
        En <strong>${anio}</strong>, considerando <strong>${nombreRegion}</strong>, 
        <strong>${paisesSuicidioMayor}</strong> de <strong>${totalPaises}</strong> países 
        (${porcentajeSuicidio}%) presentan una tasa de suicidio mayor. 
        En <strong>${paisesHomicidioMayor}</strong> países (${porcentajeHomicidio}%) predomina el homicidio, 
        y en <strong>${paisesSimilares}</strong> las tasas son similares.
    `;
}

function actualizarInsights(anio, datosAnio) {
    const insightGeneral = document.getElementById("insightGeneral");
    const insightSuicidio = document.getElementById("insightSuicidio");
    const insightHomicidio = document.getElementById("insightHomicidio");

    if (!insightGeneral || !insightSuicidio || !insightHomicidio) {
        return;
    }

    if (datosAnio.length === 0) {
        insightGeneral.textContent = "No hay países con datos completos para esta combinación de filtros.";
        insightSuicidio.textContent = "No disponible.";
        insightHomicidio.textContent = "No disponible.";
        return;
    }

    const total = datosAnio.length;
    const suicidioMayor = datosAnio.filter(d => d.ComparisonCategory === "Suicidio mayor").length;
    const homicidioMayor = datosAnio.filter(d => d.ComparisonCategory === "Homicidio mayor").length;

    let categoriaDominante = "tasas similares";
    let cantidadDominante = total - suicidioMayor - homicidioMayor;

    if (suicidioMayor >= homicidioMayor && suicidioMayor >= cantidadDominante) {
        categoriaDominante = "predominio de suicidio";
        cantidadDominante = suicidioMayor;
    } else if (homicidioMayor >= suicidioMayor && homicidioMayor >= cantidadDominante) {
        categoriaDominante = "predominio de homicidio";
        cantidadDominante = homicidioMayor;
    }

    insightGeneral.innerHTML = `
        En ${anio}, el grupo más frecuente es <strong>${categoriaDominante}</strong>, 
        con ${cantidadDominante} de ${total} países visibles.
    `;

    const maxSuicidio = datosAnio
        .filter(d => d.Difference > 0)
        .sort((a, b) => b.Difference - a.Difference)[0];

    const maxHomicidio = datosAnio
        .filter(d => d.Difference < 0)
        .sort((a, b) => a.Difference - b.Difference)[0];

    if (maxSuicidio) {
        insightSuicidio.innerHTML = `
            <strong>${maxSuicidio.CountryName}</strong> tiene la mayor diferencia positiva visible: 
            +${maxSuicidio.Difference.toFixed(2)} puntos por cada 100.000 habitantes.
        `;
    } else {
        insightSuicidio.textContent = "No hay países visibles donde la tasa de suicidio supere a la de homicidio.";
    }

    if (maxHomicidio) {
        insightHomicidio.innerHTML = `
            <strong>${maxHomicidio.CountryName}</strong> tiene la mayor diferencia hacia homicidio: 
            ${maxHomicidio.Difference.toFixed(2)} puntos por cada 100.000 habitantes.
        `;
    } else {
        insightHomicidio.textContent = "No hay países visibles donde la tasa de homicidio supere a la de suicidio.";
    }
}

function dibujarScatterComparacion(datosAnio) {
    const maxTasa = obtenerMaximoTasa(datosAnio);

    const datosSuicidioMayor = datosAnio.filter(d => d.ComparisonCategory === "Suicidio mayor");
    const datosHomicidioMayor = datosAnio.filter(d => d.ComparisonCategory === "Homicidio mayor");
    const datosSimilares = datosAnio.filter(d => d.ComparisonCategory === "Tasas similares");

    const trazaDiagonal = {
        type: "scatter",
        mode: "lines",
        x: [0, maxTasa],
        y: [0, maxTasa],
        line: {
            color: "#111827",
            width: 2,
            dash: "dash"
        },
        hoverinfo: "skip",
        name: "Igualdad"
    };

    const trazaSuicidio = crearTrazaScatter(
        datosSuicidioMayor,
        "Predomina suicidio",
        COLOR_SUICIDIO,
        "circle"
    );

    const trazaHomicidio = crearTrazaScatter(
        datosHomicidioMayor,
        "Predomina homicidio",
        COLOR_HOMICIDIO,
        "square"
    );

    const trazaSimilar = crearTrazaScatter(
        datosSimilares,
        "Tasas similares",
        COLOR_SIMILAR,
        "diamond"
    );

    const trazas = [
        trazaDiagonal,
        trazaSuicidio,
        trazaHomicidio,
        trazaSimilar
    ];

    if (paisResaltado !== null) {
        const datoPais = datosAnio.find(d => d.CountryCode === paisResaltado);

        if (datoPais) {
            trazas.push(crearTrazaScatterPaisResaltado(datoPais));
        }
    }

    const layout = {
        xaxis: {
            title: "Tasa de homicidios por 100.000 habitantes",
            range: [0, maxTasa],
            zeroline: true,
            gridcolor: "#e5e7eb"
        },
        yaxis: {
            title: "Tasa de suicidios por 100.000 habitantes",
            range: [0, maxTasa],
            zeroline: true,
            gridcolor: "#e5e7eb"
        },
        annotations: [
            {
                x: maxTasa * 0.23,
                y: maxTasa * 0.82,
                text: "Predomina suicidio",
                showarrow: false,
                font: {
                    size: 13,
                    color: COLOR_SUICIDIO_ACTIVO
                }
            },
            {
                x: maxTasa * 0.78,
                y: maxTasa * 0.18,
                text: "Predomina homicidio",
                showarrow: false,
                font: {
                    size: 13,
                    color: COLOR_HOMICIDIO_ACTIVO
                }
            }
        ],
        margin: { l: 64, r: 20, t: 20, b: 64 },
        paper_bgcolor: "white",
        plot_bgcolor: "white",
        hovermode: "closest",
        showlegend: true,
        legend: {
            orientation: "h",
            x: 0,
            y: 1.08,
            font: {
                size: 11
            }
        }
    };

    Plotly.react("scatterComparacion", trazas, layout, crearConfig());
    activarInteraccionGrafico("scatterComparacion");
}

function crearTrazaScatter(arregloDatos, nombre, color, simbolo) {
    return {
        type: "scatter",
        mode: "markers",
        name: nombre,
        x: arregloDatos.map(d => d.HomicideRate),
        y: arregloDatos.map(d => d.SuicideRate),
        text: arregloDatos.map(d => d.CountryName),
        customdata: crearCustomData(arregloDatos),
        marker: {
            color: color,
            size: 10,
            symbol: simbolo,
            opacity: 0.72,
            line: {
                color: "white",
                width: 0.8
            }
        },
        hovertemplate:
            "<b>%{text}</b><br>" +
            "Homicidios: %{x:.2f}<br>" +
            "Suicidios: %{y:.2f}<br>" +
            "<extra></extra>"
    };
}

function crearTrazaScatterPaisResaltado(datoPais) {
    return {
        type: "scatter",
        mode: "markers",
        name: "País fijado",
        x: [datoPais.HomicideRate],
        y: [datoPais.SuicideRate],
        text: [datoPais.CountryName],
        customdata: crearCustomData([datoPais]),
        marker: {
            color: obtenerColorCategoria(datoPais.ComparisonCategory, true),
            size: 17,
            opacity: 1,
            symbol: "circle-open",
            line: {
                color: COLOR_BORDE_ACTIVO,
                width: 4
            }
        },
        hovertemplate:
            "<b>%{text}</b><br>" +
            "País fijado<br>" +
            "Homicidios: %{x:.2f}<br>" +
            "Suicidios: %{y:.2f}<br>" +
            "<extra></extra>"
    };
}

function dibujarMapaDiferencia(datosAnio) {
    const maxAbs = Math.min(obtenerMaximoDiferenciaAbsoluta(datosAnio), 25);
    const datosRegionBase = obtenerDatosRegionBaseMapa(anioActual);

    const trazas = [];

    if (regionActual !== "Todas" && datosRegionBase.length > 0) {
        trazas.push(crearTrazaInvisibleParaZoom(datosRegionBase));
    }

    const trace = {
        type: "choropleth",
        locationmode: "ISO-3",
        locations: datosAnio.map(d => d.CountryCode),
        z: datosAnio.map(d => d.Difference),
        text: datosAnio.map(d => d.CountryName),
        customdata: crearCustomData(datosAnio),
        colorscale: [
            [0, "#004C7A"],
            [0.25, "#9ECAE1"],
            [0.5, "#F7F7F7"],
            [0.75, "#E7B6D1"],
            [1, "#8F3F6D"]
        ],
        zmin: -maxAbs,
        zmax: maxAbs,
        zmid: 0,
        colorbar: {
            title: {
                text: "Suicidio - homicidio",
                side: "top"
            },
            orientation: "h",
            x: 0.5,
            xanchor: "center",
            y: -0.13,
            yanchor: "top",
            len: 0.72,
            thickness: 14,
            outlinewidth: 0.8
        },
        marker: {
            line: { color: "white", width: 0.4 }
        },
        hovertemplate:
            "<b>%{text}</b><br>" +
            "Diferencia: %{z:.2f}<br>" +
            "<extra></extra>"
    };

    trazas.push(trace);

    if (paisResaltado !== null) {
        const datoPais = datosAnio.find(d => d.CountryCode === paisResaltado);

        if (datoPais) {
            trazas.push(crearTrazaMapaPaisResaltado(datoPais));
        }
    }

    Plotly.react("mapaDiferencia", trazas, crearLayoutMapa(), crearConfig());
    activarInteraccionGrafico("mapaDiferencia");
}

function crearTrazaInvisibleParaZoom(datosRegionBase) {
    return {
        type: "choropleth",
        locationmode: "ISO-3",
        locations: datosRegionBase.map(d => d.CountryCode),
        z: datosRegionBase.map(() => 0),
        text: datosRegionBase.map(d => d.CountryName),
        colorscale: [
            [0, "rgba(255,255,255,0)"],
            [1, "rgba(255,255,255,0)"]
        ],
        showscale: false,
        hoverinfo: "skip",
        opacity: 0,
        marker: {
            line: { color: "rgba(255,255,255,0)", width: 0 }
        }
    };
}

function crearTrazaMapaPaisResaltado(datoPais) {
    return {
        type: "choropleth",
        locationmode: "ISO-3",
        locations: [datoPais.CountryCode],
        z: [1],
        text: [datoPais.CountryName],
        customdata: crearCustomData([datoPais]),
        colorscale: [
            [0, obtenerColorCategoria(datoPais.ComparisonCategory, true)],
            [1, obtenerColorCategoria(datoPais.ComparisonCategory, true)]
        ],
        showscale: false,
        marker: {
            line: { color: COLOR_BORDE_ACTIVO, width: 2.8 }
        },
        hovertemplate:
            "<b>%{text}</b><br>" +
            "País fijado<br>" +
            "<extra></extra>"
    };
}

function crearLayoutMapa() {
    const geoBase = {
        projection: {
            type: "natural earth"
        },

        showframe: false,
        showcoastlines: true,
        coastlinecolor: "#94a3b8",

        showland: true,
        landcolor: "#eeeeee",

        showcountries: true,
        countrycolor: "#ffffff",
        countrywidth: 0.5,

        showocean: true,
        oceancolor: "#ffffff",

        bgcolor: "rgba(0,0,0,0)",
        fixedrange: true
    };

    if (regionActual === "Todas") {
        geoBase.scope = "world";
        geoBase.center = {
            lon: 10,
            lat: 18
        };
        geoBase.projection.scale = 1.05;
        geoBase.lataxis = {
            range: [-58, 85]
        };
        geoBase.lonaxis = {
            range: [-180, 180]
        };
    } else {
        geoBase.fitbounds = "locations";
    }

    return {
        geo: geoBase,

        margin: {
            l: 0,
            r: 0,
            t: 0,
            b: 72
        },

        paper_bgcolor: "white",
        plot_bgcolor: "white",
        dragmode: false
    };
}

function crearConfig() {
    return {
        responsive: true,
        displayModeBar: false,
        scrollZoom: false,
        staticPlot: false
    };
}

function activarInteraccionGrafico(idGrafico) {
    const grafico = document.getElementById(idGrafico);

    if (!grafico) {
        return;
    }

    if (typeof grafico.removeAllListeners === "function") {
        grafico.removeAllListeners("plotly_hover");
        grafico.removeAllListeners("plotly_click");
        grafico.removeAllListeners("plotly_unhover");
    }

    grafico.on("plotly_hover", function(eventData) {
        manejarHoverPais(eventData);
    });

    grafico.on("plotly_click", function(eventData) {
        manejarClickPais(eventData);
    });

    grafico.on("plotly_unhover", function() {
        detenerSonidoHover();
    });

    grafico.onmouseleave = function() {
        detenerSonidoHover();
    };
}

function manejarHoverPais(eventData) {
    if (paisFijado) {
        return;
    }

    const punto = eventData.points[0];

    if (!punto || !punto.customdata) {
        return;
    }

    const info = punto.customdata;

    mostrarComparacionPais(info, "hover");

    if (sonidoActivado) {
        reproducirSonidoHover(Number(info[1]), Number(info[2]), info[8]);
    }
}

function manejarClickPais(eventData) {
    const punto = eventData.points[0];

    if (!punto || !punto.customdata) {
        return;
    }

    const info = punto.customdata;
    const codigoPais = info[8];

    paisSelectorActual = codigoPais;
    paisResaltado = codigoPais;
    paisFijado = true;

    mostrarComparacionPais(info, "click");
    dibujarVisualizacion(anioActual);

    if (sonidoActivado) {
        reproducirSonificacion(Number(info[1]), Number(info[2]));
    }
}

function crearCustomData(arregloDatos) {
    return arregloDatos.map(d => [
        d.CountryName,
        d.HomicideRate,
        d.SuicideRate,
        d.Region,
        d.IncomeLevel,
        d.RatioSuicideHomicide,
        d.ComparisonCategory,
        d.Difference,
        d.CountryCode
    ]);
}

function mostrarComparacionPais(info, tipoInteraccion) {
    const pais = info[0];
    const homicidios = Number(info[1]);
    const suicidios = Number(info[2]);
    const region = info[3] || "Sin región";
    const ingreso = traducirIngreso(info[4]);
    const razon = Number(info[5]);
    const categoriaOriginal = info[6];
    const categoria = traducirCategoria(categoriaOriginal);
    const diferencia = Number(info[7]);

    const tituloInteraccion = tipoInteraccion === "click" ? "País fijado" : "Vista rápida";

    let textoComparacion = "";
    let interpretacion = "";
    let clasePill = "similar";

    if (categoriaOriginal === "Suicidio mayor") {
        clasePill = "suicidio";
        textoComparacion = "Predomina suicidio.";
        interpretacion = "La mortalidad por suicidio aparece con mayor magnitud que la mortalidad por homicidio al compararlas como tasas.";
    } else if (categoriaOriginal === "Homicidio mayor") {
        clasePill = "homicidio";
        textoComparacion = "Predomina homicidio.";
        interpretacion = "La mortalidad por homicidio aparece con mayor magnitud que la mortalidad por suicidio al compararlas como tasas.";
    } else {
        clasePill = "similar";
        textoComparacion = "Las tasas son similares.";
        interpretacion = "Homicidio y suicidio tienen magnitudes cercanas, por lo que ambos fenómenos deberían observarse en conjunto.";
    }

    let razonTexto = "";

    if (!isNaN(razon) && isFinite(razon)) {
        razonTexto = `La tasa de suicidio equivale a <strong>${razon.toFixed(2)}</strong> veces la tasa de homicidio.`;
    } else {
        razonTexto = `No se puede calcular la razón porque la tasa de homicidio es 0 o no está disponible.`;
    }

    document.getElementById("infoPais").classList.add("active");

    document.getElementById("infoPais").innerHTML = `
        <div class="country-result-header">
            <div>
                <p class="mb-1 small-note"><strong>${tituloInteraccion}</strong></p>
                <h4 class="h4 fw-bold mb-0">${pais} — ${anioActual}</h4>
            </div>

            <span class="result-pill ${clasePill}">
                ${categoria}
            </span>
        </div>

        <div class="info-grid">
            <div class="metric-card">
                <div class="metric-label">Tasa de homicidios</div>
                <div class="metric-value">${homicidios.toFixed(2)}</div>
                <div class="small-note">por cada 100.000 habitantes</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Tasa de suicidios</div>
                <div class="metric-value">${suicidios.toFixed(2)}</div>
                <div class="small-note">por cada 100.000 habitantes</div>
            </div>

            <div class="metric-card">
                <div class="metric-label">Diferencia</div>
                <div class="metric-value">${diferencia.toFixed(2)}</div>
                <div class="small-note">suicidios − homicidios</div>
            </div>
        </div>

        <div class="comparison-result">
            <p class="mb-1"><strong>${textoComparacion}</strong></p>
            <p class="mb-1">${razonTexto}</p>
            <p class="mb-0 small-note">${interpretacion}</p>
        </div>

        <div class="context-box small-note">
            <p class="mb-1"><strong>Contexto del país</strong></p>
            <p class="mb-1">Continente/región: ${region}</p>
            <p class="mb-1">Nivel de ingreso: ${ingreso}</p>
            <p class="mb-0">Categoría comparativa: <strong>${categoria}</strong></p>
        </div>
    `;
}

function limpiarPanelPais() {
    document.getElementById("infoPais").classList.remove("active");

    document.getElementById("infoPais").innerHTML = `
        <p class="mb-1">
            Selecciona un país en el mapa, en el gráfico o desde el selector.
        </p>
        <p class="mb-0 small-note">
            El panel mostrará qué tasa predomina y cuán grande es la diferencia.
        </p>
    `;
}

function obtenerCategoriaComparativa(homicidios, suicidios) {
    if (suicidios >= homicidios * 1.2) {
        return "Suicidio mayor";
    }

    if (homicidios >= suicidios * 1.2) {
        return "Homicidio mayor";
    }

    return "Tasas similares";
}

function obtenerColorCategoria(categoria, activo = false) {
    if (categoria === "Suicidio mayor") {
        return activo ? COLOR_SUICIDIO_ACTIVO : COLOR_SUICIDIO;
    }

    if (categoria === "Homicidio mayor") {
        return activo ? COLOR_HOMICIDIO_ACTIVO : COLOR_HOMICIDIO;
    }

    return activo ? COLOR_SIMILAR_ACTIVO : COLOR_SIMILAR;
}

function obtenerMaximoTasa(datosAnio) {
    const valores = datosAnio.flatMap(d => [d.HomicideRate, d.SuicideRate]);
    const maximo = d3.max(valores);

    if (!maximo || isNaN(maximo)) {
        return 10;
    }

    return Math.ceil(maximo * 1.05);
}

function obtenerMaximoDiferenciaAbsoluta(datosAnio) {
    const valores = datosAnio.map(d => Math.abs(d.Difference));
    const maximo = d3.max(valores);

    if (!maximo || isNaN(maximo)) {
        return 10;
    }

    return Math.ceil(maximo * 1.05);
}

function traducirIngreso(valor) {
    const traducciones = {
        "High income": "Ingreso alto",
        "Upper middle income": "Ingreso medio-alto",
        "Lower middle income": "Ingreso medio-bajo",
        "Low income": "Ingreso bajo",
        "Aggregates": "Agregado"
    };

    return traducciones[valor] || valor || "Sin información";
}

function traducirCategoria(valor) {
    const traducciones = {
        "Suicidio mayor": "Predomina suicidio",
        "Homicidio mayor": "Predomina homicidio",
        "Tasas similares": "Tasas similares"
    };

    return traducciones[valor] || valor || "Sin información";
}

function reproducirAudioCategoria(categoria, diferencia) {
    detenerAudios();

    let audioElegido = null;

    if (categoria === "Suicidio mayor") {
        audioElegido = audioSuicidio;
    } else if (categoria === "Homicidio mayor") {
        audioElegido = audioHomicidio;
    } else {
        audioElegido = audioSimilar;
    }

    if (audioElegido === null) {
        return;
    }

    audioElegido.currentTime = 0;

    const volumen = calcularVolumenPorDiferencia(diferencia, categoria);
    audioElegido.volume = volumen;

    audioElegido.play().catch(error => {
        console.warn("No se pudo reproducir el audio:", error);
    });
}

function calcularVolumenPorDiferencia(diferencia, categoria) {
    if (categoria === "Tasas similares") {
        return 0.28;
    }

    if (diferencia < 2) {
        return 0.35;
    }

    if (diferencia < 8) {
        return 0.55;
    }

    if (diferencia < 20) {
        return 0.75;
    }

    return 0.9;
}

function detenerAudios() {
    const audios = [audioHomicidio, audioSuicidio, audioSimilar];

    audios.forEach(audio => {
        if (audio !== null) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
}

function reproducirSonidoCambioAnio(anio) {
    if (!sonidoActivado || synthYear === null) {
        return;
    }

    const indice = aniosDisponibles.indexOf(anio);
    const notas = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
    const nota = notas[indice % notas.length];

    synthYear.triggerAttackRelease(nota, "16n");
}

function reproducirSonidoHover(homicidios, suicidios, codigoPais) {
    return;
}

function detenerSonidoHover() {
    paisSonando = null;
}

function reproducirSonificacion(homicidios, suicidios) {
    if (!sonidoActivado) {
        return;
    }

    const categoria = obtenerCategoriaComparativa(homicidios, suicidios);
    const diferencia = Math.abs(suicidios - homicidios);

    reproducirAudioCategoria(categoria, diferencia);
}