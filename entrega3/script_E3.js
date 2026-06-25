/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const RUTA_CSV = "data/datos_mapa_homicidio_suicidio.csv";
const ANIO_MIN = 2000;
const ANIO_MAX = 2018;
const DURACION_FRAME_MS = 900;     // tiempo "musical" entre un año y el siguiente
const UMBRAL_SIMILAR = 1;          // diferencia (en tasa) por debajo de la cual se considera "similar"

/* =========================================================
   ESTADO
   ========================================================= */

let datosCompletos = [];
let serieAnual = [];   // [{anio, homicidio, suicidio}, ...] para la región actual
let region = "Todas";
let sonidoListo = false;
let synthHomicidio = null;
let synthSuicidio = null;

// Animación continua (requestAnimationFrame), no por intervalos discretos,
// para que el avance del gráfico se vea como un trazo fluido y no como
// "saltos" pegados cada año.
let animando = false;
let inicioAnimacionMs = null;
let tiempoAcumuladoMs = 0;
let idAnimacion = null;
let ultimoIndiceSonado = -1;

let escalaX, escalaY, svg, anchoSvg, altoSvg;
let puntoHomicidio, puntoSuicidio, rectRevelado;
const margen = { top: 20, right: 24, bottom: 30, left: 42 };

/* =========================================================
   CARGA DE DATOS
   ========================================================= */

d3.csv(RUTA_CSV, d3.autoType).then(function (datos) {
    datosCompletos = datos;

    const parametros = new URLSearchParams(window.location.search);
    region = parametros.get("region") || "Todas";

    document.getElementById("titulo").textContent =
        region === "Todas" ? "Todo el mundo" : region;

    calcularSerieAnual();
    inicializarGrafico();
    actualizarFrame(0);

    document.getElementById("btnPlay").addEventListener("click", async function () {
        if (!sonidoListo) {
            await Tone.start();
            crearSynths();
            sonidoListo = true;
        }

        if (animando) {
            pausar();
        } else {
            reproducir();
        }
    });

    document.getElementById("btnReiniciar").addEventListener("click", function () {
        pausar();
        tiempoAcumuladoMs = 0;
        ultimoIndiceSonado = -1;
        actualizarFrame(0);
    });

}).catch(function (error) {
    console.error("Error al cargar el CSV:", error);
    document.getElementById("grafico").innerHTML =
        "<p style='color:#b91c1c;'>No se pudo cargar el archivo de datos.</p>";
});

/* =========================================================
   PROCESAMIENTO: promedio por año para la región elegida
   ========================================================= */

function calcularSerieAnual() {
    const filtrados = region === "Todas"
        ? datosCompletos
        : datosCompletos.filter(d => d.Region === region);

    const porAnio = d3.groups(filtrados, d => d.Year)
        .map(([anio, filas]) => ({
            anio: anio,
            homicidio: d3.mean(filas, d => d.HomicideRate),
            suicidio: d3.mean(filas, d => d.SuicideRate)
        }))
        .filter(d => d.anio >= ANIO_MIN && d.anio <= ANIO_MAX)
        .sort((a, b) => a.anio - b.anio);

    serieAnual = porAnio;
}

/* =========================================================
   GRÁFICO (D3, un solo svg con 2 líneas + áreas)
   ========================================================= */

function inicializarGrafico() {
    anchoSvg = 680;
    altoSvg = 360;

    const contenedor = d3.select("#grafico");
    contenedor.selectAll("*").remove();

    svg = contenedor.append("svg")
        .attr("viewBox", `0 0 ${anchoSvg} ${altoSvg}`)
        .attr("width", "100%")
        .style("height", "auto");

    const anchoUtil = anchoSvg - margen.left - margen.right;
    const altoUtil = altoSvg - margen.top - margen.bottom;

    escalaX = d3.scaleLinear()
        .domain(d3.extent(serieAnual, d => d.anio))
        .range([margen.left, margen.left + anchoUtil]);

    const maxValor = d3.max(serieAnual, d => Math.max(d.homicidio, d.suicidio)) || 1;

    escalaY = d3.scaleLinear()
        .domain([0, maxValor * 1.15])
        .range([margen.top + altoUtil, margen.top]);

    svg.append("g")
        .attr("class", "eje")
        .attr("transform", `translate(0, ${margen.top + altoUtil})`)
        .call(d3.axisBottom(escalaX).ticks(8).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "eje")
        .attr("transform", `translate(${margen.left}, 0)`)
        .call(d3.axisLeft(escalaY).ticks(5));

    // El rectángulo de "revelado" se va ensanchando de izquierda a derecha
    // a medida que avanza la animación: así el trazo se ve dibujándose de
    // forma continua en vez de aparecer en saltos discretos por año.
    svg.append("clipPath")
        .attr("id", "clipRevelado")
        .append("rect")
        .attr("id", "rectRevelado")
        .attr("x", margen.left)
        .attr("y", 0)
        .attr("width", 0)
        .attr("height", altoSvg);

    rectRevelado = d3.select("#rectRevelado");

    const lineaHomicidio = d3.line().x(d => escalaX(d.anio)).y(d => escalaY(d.homicidio));
    const lineaSuicidio = d3.line().x(d => escalaX(d.anio)).y(d => escalaY(d.suicidio));

    const areaHomicidio = d3.area()
        .x(d => escalaX(d.anio))
        .y0(escalaY(0))
        .y1(d => escalaY(d.homicidio));

    const areaSuicidio = d3.area()
        .x(d => escalaX(d.anio))
        .y0(escalaY(0))
        .y1(d => escalaY(d.suicidio));

    const grupoRevelado = svg.append("g").attr("clip-path", "url(#clipRevelado)");

    grupoRevelado.append("path").attr("class", "area-suicidio").attr("d", areaSuicidio(serieAnual));
    grupoRevelado.append("path").attr("class", "area-homicidio").attr("d", areaHomicidio(serieAnual));
    grupoRevelado.append("path").attr("class", "linea-suicidio").attr("d", lineaSuicidio(serieAnual));
    grupoRevelado.append("path").attr("class", "linea-homicidio").attr("d", lineaHomicidio(serieAnual));

    // Halo suave detrás de cada punto, para que la cabeza de la animación
    // se note más y la pantalla no se vea tan vacía cuando hay pocos años.
    svg.append("circle").attr("id", "haloHomicidio").attr("class", "punto-glow").attr("r", 11).attr("fill", "#0072B2");
    svg.append("circle").attr("id", "haloSuicidio").attr("class", "punto-glow").attr("r", 11).attr("fill", "#CC79A7");

    puntoHomicidio = svg.append("circle")
        .attr("id", "puntoHomicidio")
        .attr("r", 6)
        .attr("fill", "#0072B2")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    puntoSuicidio = svg.append("circle")
        .attr("id", "puntoSuicidio")
        .attr("r", 6)
        .attr("fill", "#CC79A7")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
}

/* =========================================================
   ANIMACIÓN continua: "progreso" es un índice fraccionario
   dentro de serieAnual (0 = primer año, n-1 = último año).
   ========================================================= */

function dibujarEnProgreso(progreso) {
    const n = serieAnual.length;
    const progresoAcotado = Math.max(0, Math.min(progreso, n - 1));

    const idx0 = Math.min(Math.floor(progresoAcotado), n - 2 >= 0 ? n - 2 : 0);
    const idx1 = Math.min(idx0 + 1, n - 1);
    const frac = n > 1 ? progresoAcotado - idx0 : 0;

    const d0 = serieAnual[idx0];
    const d1 = serieAnual[idx1];

    const homicidioInterp = d0.homicidio + (d1.homicidio - d0.homicidio) * frac;
    const suicidioInterp = d0.suicidio + (d1.suicidio - d0.suicidio) * frac;

    const cx = escalaX(d0.anio) + (escalaX(d1.anio) - escalaX(d0.anio)) * frac;
    const cyHomicidio = escalaY(homicidioInterp);
    const cySuicidio = escalaY(suicidioInterp);

    rectRevelado.attr("width", Math.max(0, cx - margen.left));

    puntoHomicidio.attr("cx", cx).attr("cy", cyHomicidio);
    puntoSuicidio.attr("cx", cx).attr("cy", cySuicidio);
    d3.select("#haloHomicidio").attr("cx", cx).attr("cy", cyHomicidio);
    d3.select("#haloSuicidio").attr("cx", cx).attr("cy", cySuicidio);

    const anioMostrado = Math.round(d0.anio + (d1.anio - d0.anio) * frac);
    document.getElementById("anioActual").textContent = `Año: ${anioMostrado}`;

    actualizarBadgePredominio(homicidioInterp, suicidioInterp);
}

function actualizarBadgePredominio(homicidio, suicidio) {
    const diferencia = homicidio - suicidio;
    const badge = document.getElementById("badgePredominio");

    if (Math.abs(diferencia) < UMBRAL_SIMILAR) {
        badge.textContent = "Tasas similares";
        badge.style.backgroundColor = "var(--color-similar)";
    } else if (diferencia > 0) {
        badge.textContent = `Predomina homicidio (+${diferencia.toFixed(1)})`;
        badge.style.backgroundColor = "var(--color-homicidio-oscuro)";
    } else {
        badge.textContent = `Predomina suicidio (+${Math.abs(diferencia).toFixed(1)})`;
        badge.style.backgroundColor = "var(--color-suicidio-oscuro)";
    }
}

function actualizarFrame(progreso) {
    dibujarEnProgreso(progreso);
}

function pasoAnimacion(ahoraMs) {
    if (inicioAnimacionMs === null) {
        inicioAnimacionMs = ahoraMs - tiempoAcumuladoMs;
    }

    tiempoAcumuladoMs = ahoraMs - inicioAnimacionMs;

    const progreso = tiempoAcumuladoMs / DURACION_FRAME_MS;
    const indiceEntero = Math.floor(progreso);

    if (indiceEntero > ultimoIndiceSonado && indiceEntero < serieAnual.length) {
        sonificarFrame(serieAnual[indiceEntero]);
        ultimoIndiceSonado = indiceEntero;
    }

    dibujarEnProgreso(progreso);

    if (progreso >= serieAnual.length - 1) {
        dibujarEnProgreso(serieAnual.length - 1);
        pausar();
        tiempoAcumuladoMs = 0;
        ultimoIndiceSonado = -1;
        return;
    }

    idAnimacion = requestAnimationFrame(pasoAnimacion);
}

function reproducir() {
    animando = true;
    document.getElementById("btnPlay").textContent = "⏸ Pausar";
    inicioAnimacionMs = null;
    idAnimacion = requestAnimationFrame(pasoAnimacion);
}

function pausar() {
    animando = false;
    if (idAnimacion) {
        cancelAnimationFrame(idAnimacion);
        idAnimacion = null;
    }
    inicioAnimacionMs = null;
    document.getElementById("btnPlay").textContent = "▶ Reproducir con sonido";
}

/* =========================================================
   SONIFICACIÓN
   Tono fijo por serie (homicidio / suicidio), pero la ALTURA
   de la nota y el VOLUMEN varían según el valor de ese año,
   para que el sonido transmita magnitud y no solo categoría.
   ========================================================= */

function crearSynths() {
    synthHomicidio = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.25 }
    }).toDestination();

    synthSuicidio = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.25 }
    }).toDestination();
}

function sonificarFrame(punto) {
    if (!sonidoListo) return;

    const maxValor = d3.max(serieAnual, d => Math.max(d.homicidio, d.suicidio)) || 1;

    reproducirNota(synthHomicidio, punto.homicidio, maxValor, "C3", "C5");
    reproducirNota(synthSuicidio, punto.suicidio, maxValor, "C4", "C6");
}

function reproducirNota(synth, valor, maxValor, notaBaja, notaAlta) {
    const proporcion = Math.min(valor / maxValor, 1);

    const midiBajo = Tone.Frequency(notaBaja).toMidi();
    const midiAlto = Tone.Frequency(notaAlta).toMidi();
    const midiNota = midiBajo + proporcion * (midiAlto - midiBajo);

    const volumenDb = -24 + proporcion * 20; // más valor -> más fuerte

    synth.volume.value = volumenDb;
    synth.triggerAttackRelease(Tone.Frequency(midiNota, "midi"), "8n");
}
