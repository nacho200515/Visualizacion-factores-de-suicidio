let datos = [];
let anioActual = 2018;
let paisResaltado = null;
let paisFijado = false;

let sonidoActivado = false;
let synthHover = null;
let synthClick = null;
let synthYear = null;
let paisSonando = null;

let regionActual = "Todas";
let categoriaActual = "Todas";

const COLOR_SUICIDIO = "#CC79A7";
const COLOR_SUICIDIO_ACTIVO = "#8F3F6D";
const COLOR_HOMICIDIO = "#0072B2";
const COLOR_HOMICIDIO_ACTIVO = "#004C7A";
const COLOR_SIMILAR = "#999999";
const COLOR_SIMILAR_ACTIVO = "#4B5563";
const COLOR_BORDE_ACTIVO = "#111827";

const UMBRAL_SIMILAR = 1;

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

            const diferencia = suicidios - homicidios;
            const razon = homicidios > 0 ? suicidios / homicidios : null;

            return {
                CountryName: d.CountryName,
                CountryCode: d.CountryCode,
                Year: Number(d.Year),
                HomicideRate: homicidios,
                SuicideRate: suicidios,
                Region: d.Region,
                IncomeLevel: d.IncomeLevel,
                Difference: diferencia,
                RatioSuicideHomicide: razon,
                ComparisonCategory: obtenerCategoriaComparativa(homicidios, suicidios)
            };
        })
        .filter(d =>
            d.CountryName &&
            d.CountryCode &&
            !isNaN(d.Year) &&
            !isNaN(d.HomicideRate) &&
            !isNaN(d.SuicideRate)
        );

    const yearLabel = document.getElementById("yearLabel");
    const btnSonido = document.getElementById("btnSonido");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const filtroRegion = document.getElementById("filtroRegion");
    const filtroCategoria = document.getElementById("filtroCategoria");

    crearLineaTemporal();
    cargarOpcionesRegion();

    filtroRegion.addEventListener("change", function () {
        regionActual = filtroRegion.value;
        paisResaltado = null;
        paisFijado = false;
        limpiarPanelPais();
        dibujarVisualizacion(anioActual);
    });

    filtroCategoria.addEventListener("change", function () {
        categoriaActual = filtroCategoria.value;
        paisResaltado = null;
        paisFijado = false;
        limpiarPanelPais();
        dibujarVisualizacion(anioActual);
    });

    btnLimpiar.addEventListener("click", function () {
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

            synthHover = new Tone.Synth({
                oscillator: { type: "sine" },
                envelope: {
                    attack: 0.08,
                    decay: 0.15,
                    sustain: 0.25,
                    release: 0.4
                },
                volume: -22
            }).toDestination();

            synthClick = new Tone.Synth({
                oscillator: { type: "triangle" },
                envelope: {
                    attack: 0.04,
                    decay: 0.2,
                    sustain: 0.2,
                    release: 0.5
                },
                volume: -15
            }).toDestination();

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

            if (synthHover !== null) {
                synthHover.dispose();
                synthHover = null;
            }

            if (synthClick !== null) {
                synthClick.dispose();
                synthClick = null;
            }

            if (synthYear !== null) {
                synthYear.dispose();
                synthYear = null;
            }

            btnSonido.textContent = "Activar audio";
            btnSonido.classList.remove("btn-success");
            btnSonido.classList.add("btn-primary");
        }
    });

    anioActual = 2018;
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

    const regiones = Array.from(
        new Set(datos.map(d => d.Region).filter(Boolean))
    ).sort();

    regiones.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = limpiarRegion(region);
        filtroRegion.appendChild(option);
    });
}

function cambiarAnio(nuevoAnio) {
    if (nuevoAnio === anioActual) {
        return;
    }

    anioActual = nuevoAnio;
    document.getElementById("yearLabel").textContent = anioActual;

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

    actualizarResumen(anio, datosFiltrados);
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
            size: 8,
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
            size: 15,
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
    const maxAbs = obtenerMaximoDiferenciaAbsoluta(datosAnio);

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
            y: -0.18,
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

    const trazas = [trace];

    if (paisResaltado !== null) {
        const datoPais = datosAnio.find(d => d.CountryCode === paisResaltado);

        if (datoPais) {
            trazas.push(crearTrazaMapaPaisResaltado(datoPais));
        }
    }

    Plotly.react("mapaDiferencia", trazas, crearLayoutMapa(), crearConfig());
    activarInteraccionGrafico("mapaDiferencia");
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
            line: { color: COLOR_BORDE_ACTIVO, width: 2.4 }
        },
        hovertemplate:
            "<b>%{text}</b><br>" +
            "País fijado<br>" +
            "<extra></extra>"
    };
}

function crearLayoutMapa() {
    return {
        geo: {
            projection: { type: "natural earth" },
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
            fixedrange: true,

            // Recorta la Antártica para que no ocupe espacio
            lataxis: {
                range: [-58, 90]
            }
        },

        // Más espacio abajo para la barra horizontal
        margin: { l: 0, r: 0, t: 0, b: 70 },
        paper_bgcolor: "white",
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
    const codigoPais = info[8];

    mostrarComparacionPais(info, "hover");

    if (sonidoActivado) {
        reproducirSonidoHover(Number(info[1]), Number(info[2]), codigoPais);
    }
}

function manejarClickPais(eventData) {
    const punto = eventData.points[0];

    if (!punto || !punto.customdata) {
        return;
    }

    const info = punto.customdata;
    const codigoPais = info[8];

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

    document.getElementById("resumenAnio").innerHTML = `
        En <strong>${anio}</strong>, considerando los filtros actuales, 
        <strong>${paisesSuicidioMayor}</strong> de <strong>${totalPaises}</strong> países 
        (${porcentajeSuicidio}%) presentan una tasa de suicidio mayor. 
        En <strong>${paisesHomicidioMayor}</strong> países (${porcentajeHomicidio}%) predomina el homicidio, 
        y en <strong>${paisesSimilares}</strong> las tasas son similares.
    `;
}

function mostrarComparacionPais(info, tipoInteraccion) {
    const pais = info[0];
    const homicidios = Number(info[1]);
    const suicidios = Number(info[2]);
    const region = limpiarRegion(info[3]);
    const ingreso = traducirIngreso(info[4]);
    const razon = Number(info[5]);
    const categoriaOriginal = info[6];
    const categoria = traducirCategoria(categoriaOriginal);
    const diferencia = Number(info[7]);

    const tituloInteraccion = tipoInteraccion === "click" ? "País fijado" : "Vista rápida";

    let textoComparacion = "";
    let interpretacion = "";

    if (categoriaOriginal === "Suicidio mayor") {
        textoComparacion = "La tasa de suicidio es mayor que la tasa de homicidio.";
        interpretacion = "En este país, el problema asociado a salud mental aparece con mayor magnitud que el homicidio al compararlos como tasas.";
    } else if (categoriaOriginal === "Homicidio mayor") {
        textoComparacion = "La tasa de homicidio es mayor que la tasa de suicidio.";
        interpretacion = "En este país, la violencia homicida aparece con mayor magnitud que el suicidio al compararlos como tasas.";
    } else {
        textoComparacion = "Ambas tasas son similares.";
        interpretacion = "En este país, homicidio y suicidio tienen magnitudes cercanas, por lo que ambos fenómenos deberían observarse en conjunto.";
    }

    let razonTexto = "";

    if (!isNaN(razon) && isFinite(razon)) {
        razonTexto = `La tasa de suicidio equivale a <strong>${razon.toFixed(2)}</strong> veces la tasa de homicidio.`;
    } else {
        razonTexto = `No se puede calcular la razón porque la tasa de homicidio es 0 o no está disponible.`;
    }

    document.getElementById("infoPais").classList.add("active");

    document.getElementById("infoPais").innerHTML = `
        <p class="mb-1 small-note"><strong>${tituloInteraccion}</strong></p>
        <h4 class="h5 fw-bold mb-2">${pais} — ${anioActual}</h4>

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
        </div>

        <div class="comparison-result">
            <p class="mb-1"><strong>${textoComparacion}</strong></p>
            <p class="mb-1">${razonTexto}</p>
            <p class="mb-1 small-note">
                Diferencia: <strong>${diferencia.toFixed(2)}</strong> puntos por cada 100.000 habitantes 
                ${diferencia >= 0 ? "(suicidios − homicidios)" : "(homicidios superan a suicidios)"}.
            </p>
            <p class="mb-0 small-note">${interpretacion}</p>
        </div>

        <div class="context-box small-note">
            <p class="mb-1"><strong>Contexto del país</strong></p>
            <p class="mb-1">Región: ${region}</p>
            <p class="mb-1">Nivel de ingreso: ${ingreso}</p>
            <p class="mb-0">Categoría comparativa: <strong>${categoria}</strong></p>
        </div>
    `;
}

function limpiarPanelPais() {
    document.getElementById("infoPais").classList.remove("active");

    document.getElementById("infoPais").innerHTML = `
        <p class="mb-1">
            Pasa el cursor sobre un país para comparar ambas tasas.
        </p>
        <p class="mb-0 small-note">
            Haz clic para fijarlo y escuchar la sonificación cuando esté activada.
        </p>
    `;
}

function obtenerCategoriaComparativa(homicidios, suicidios) {
    const diferencia = suicidios - homicidios;

    if (Math.abs(diferencia) <= UMBRAL_SIMILAR) {
        return "Tasas similares";
    }

    if (diferencia > 0) {
        return "Suicidio mayor";
    }

    return "Homicidio mayor";
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

function limpiarRegion(valor) {
    if (!valor) {
        return "Sin información";
    }

    return valor
        .replace("East Asia & Pacific", "Asia oriental y Pacífico")
        .replace("Europe & Central Asia", "Europa y Asia central")
        .replace("Latin America & Caribbean", "América Latina y el Caribe")
        .replace("Middle East & North Africa", "Medio Oriente y Norte de África")
        .replace("South Asia", "Asia del Sur")
        .replace("Sub-Saharan Africa", "África subsahariana")
        .replace("North America", "América del Norte")
        .replace("(excluding high income)", "")
        .replace("excluding high income", "")
        .replace(/\s+/g, " ")
        .trim();
}

function traducirCategoria(valor) {
    const traducciones = {
        "Suicidio mayor": "Predomina suicidio",
        "Homicidio mayor": "Predomina homicidio",
        "Tasas similares": "Tasas similares"
    };

    return traducciones[valor] || valor || "Sin información";
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
    if (!sonidoActivado || synthHover === null) {
        return;
    }

    if (paisSonando === codigoPais) {
        return;
    }

    paisSonando = codigoPais;

    const nota = notaComparacion(homicidios, suicidios);

    synthHover.triggerRelease();
    synthHover.triggerAttack(nota);
}

function detenerSonidoHover() {
    if (synthHover !== null) {
        synthHover.triggerRelease();
    }

    paisSonando = null;
}

function notaComparacion(homicidios, suicidios) {
    const categoria = obtenerCategoriaComparativa(homicidios, suicidios);

    if (categoria === "Suicidio mayor") {
        return "A4";
    }

    if (categoria === "Homicidio mayor") {
        return "C3";
    }

    return "E4";
}

function reproducirSonificacion(homicidios, suicidios) {
    if (!sonidoActivado || synthClick === null) {
        return;
    }

    detenerSonidoHover();

    const notaHomicidio = tasaANota(homicidios, "homicidio");
    const notaSuicidio = tasaANota(suicidios, "suicidio");

    const ahora = Tone.now();

    synthClick.triggerAttackRelease(notaHomicidio, "8n", ahora);
    synthClick.triggerAttackRelease(notaSuicidio, "4n", ahora + 0.45);
}

function tasaANota(tasa, tipo) {
    if (tipo === "homicidio") {
        if (tasa < 5) {
            return "C2";
        } else if (tasa < 15) {
            return "G2";
        } else if (tasa < 30) {
            return "C3";
        } else {
            return "G3";
        }
    }

    if (tasa < 5) {
        return "C4";
    } else if (tasa < 15) {
        return "G4";
    } else if (tasa < 30) {
        return "C5";
    } else {
        return "G5";
    }
}