/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const RUTA_CSV = "data/datos_mapa_homicidio_suicidio.csv";
const ANIO_MIN = 2000;
const ANIO_MAX = 2018;
const DURACION_FRAME_MS = 2200;    // tiempo "musical" entre un año y el siguiente (debe alcanzar para que se escuche el fragmento de audio completo)
const UMBRAL_SIMILAR = 1;          // diferencia (en tasa) por debajo de la cual se considera "similar"

// Color de marca por continente: el mismo color con el que está pintado
// cada continente en el mapa físico de cartón piedra. Se usa para teñir
// la silueta de fondo y el acento de la página (título, chip activo).
const COLORES_REGION = {
    "América": "#FBC02D",
    "Latinoamérica": "#8BC34A",
    "Europa": "#FB8C00",
    "África": "#E53935",
    "Asia": "#5B3A45",
    "Oceanía": "#B39DDB",
    "Todas": "#243447"
};

// Orden de aparición de los chips del selector (de izquierda a derecha).
const ORDEN_REGIONES = ["América", "Latinoamérica", "Europa", "África", "Asia", "Oceanía"];

// Países que pertenecen geográficamente a la región pero no tienen datos
// de homicidio/suicidio en el CSV (no se usan para el gráfico, solo para
// que la SILUETA de fondo no quede con "agujeros" en países sin dato,
// por ejemplo el Congo, Chad o Madagascar en África).
const PAISES_FONDO_EXTRA = {
    "África": ["CIV", "COD", "COG", "COM", "DJI", "ERI", "ESH", "GAB", "GIN", "GMB", "GNQ", "LBY", "MDG", "MLI", "MRT", "SOM", "TCD", "TGO"],
    "Asia": ["CYP", "LAO", "PRK", "PSE", "TWN"]
};

/* =========================================================
   ESTADO
   ========================================================= */

let datosCompletos = [];
let serieAnual = [];   // [{anio, homicidio, suicidio}, ...] para la región actual
let region = "Todas";
let sonidoListo = false;
let playerHomicidio = null;
let playerSuicidio = null;

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

    document.documentElement.style.setProperty("--color-tema", colorDeRegion(region));

    calcularSerieAnual();
    inicializarGrafico();
    actualizarFrame(0);
    dibujarFondoContinente(region);
    inicializarSelectorContinentes();

    document.getElementById("btnPlay").addEventListener("click", async function () {
        if (!sonidoListo) {
            const boton = document.getElementById("btnPlay");
            boton.textContent = "Cargando sonido…";
            boton.disabled = true;

            try {
                await Tone.start();
                await conTiempoLimite(cargarSonidos(), 8000, "No se pudieron cargar los archivos de audio a tiempo.");
                sonidoListo = true;
            } catch (error) {
                console.error("No se pudieron cargar los sonidos:", error);
                boton.textContent = "▶ Reproducir con sonido";
                boton.disabled = false;
                return;
            }

            boton.disabled = false;
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

function colorDeRegion(nombreRegion) {
    return COLORES_REGION[nombreRegion] || COLORES_REGION["Todas"];
}

/* =========================================================
   FONDO: silueta del continente, coloreada con su color de marca.
   Se usa Plotly con locationmode "ISO-3" (igual que el mapa de la
   Entrega 2) para que la geometría real del continente venga de los
   mismos CountryCode del CSV, sin tener que dibujar el contorno a mano.
   ========================================================= */

function dibujarFondoContinente(regionSeleccionada) {
    const color = colorDeRegion(regionSeleccionada);

    const codigos = regionSeleccionada === "Todas"
        ? Array.from(new Set(datosCompletos.map(d => d.CountryCode)))
        : Array.from(new Set([
            ...datosCompletos
                .filter(d => d.Region === regionSeleccionada)
                .map(d => d.CountryCode),
            ...(PAISES_FONDO_EXTRA[regionSeleccionada] || [])
        ]));

    const geo = {
        scope: "world",
        showframe: false,
        showcoastlines: false,
        showland: false,
        showcountries: false,
        showocean: false,
        bgcolor: "rgba(0,0,0,0)",
        projection: { type: "natural earth" }
    };

    if (regionSeleccionada === "Oceanía") {
        // Oceanía cruza la línea antimeridiana (Kiribati, Tonga, Samoa, Fiyi
        // quedan al otro lado del +-180°), lo que hace que "fitbounds"
        // calcule un encuadre gigante y casi invisible. Rotamos el centro
        // del mapa hacia el Pacífico y fijamos el encuadre a mano.
        geo.projection.rotation = { lon: 170 };
        geo.lonaxis = { range: [-30, 30] };
        geo.lataxis = { range: [-45, 5] };
    } else if (regionSeleccionada !== "Todas") {
        geo.fitbounds = "locations";
    }

    Plotly.react("fondoContinente", [{
        type: "choropleth",
        locationmode: "ISO-3",
        locations: codigos,
        z: codigos.map(() => 1),
        colorscale: [[0, color], [1, color]],
        showscale: false,
        marker: { line: { color: "rgba(255,255,255,0.4)", width: 0.5 } },
        hoverinfo: "skip"
    }], {
        geo: geo,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { t: 0, b: 0, l: 0, r: 0 }
    }, {
        staticPlot: true,
        displayModeBar: false
    }).then(function (gd) {
        ajustarEscalaFondo(gd);
    });
}

// El recuadro que calcula Plotly (sea por "fitbounds" o a mano, como en
// Oceanía) casi nunca llena la pantalla: algunos continentes son chicos
// en grados (Europa) y otros enormes (Asia), así que un único zoom fijo
// no funciona para todos. Medimos el dibujo ya renderizado y agrandamos
// lo justo y necesario para que se asome alrededor de la tarjeta blanca,
// sin importar el tamaño real del continente.
function ajustarEscalaFondo(gd) {
    const contenedor = document.getElementById("fondoContinente");
    // OJO: ".geolayer" incluye el rectángulo de fondo invisible de todo el
    // subplot (domain completo), así que su getBBox() siempre da ~el tamaño
    // del canvas. Hay que medir solo las formas de los países dibujados.
    const capaPaises = gd.querySelector(".choroplethlayer");

    if (!capaPaises) return;

    const bbox = capaPaises.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return;

    const margenExtra = 1.25; // un poco más grande que el mínimo, para que siempre se asome
    const escalaNecesaria = Math.max(
        (contenedor.clientWidth * margenExtra) / bbox.width,
        (contenedor.clientHeight * margenExtra) / bbox.height,
        1
    );

    // Hay que agrandar desde el centro de la silueta, no desde el centro de
    // la pantalla: si el dibujo de Plotly no quedó perfectamente centrado en
    // su lienzo (le pasa a Oceanía, por las islas dispersas), escalar desde
    // el centro de la pantalla empuja la silueta entera fuera de la vista.
    const centroX = bbox.x + bbox.width / 2;
    const centroY = bbox.y + bbox.height / 2;
    contenedor.style.transformOrigin = `${centroX}px ${centroY}px`;
    contenedor.style.transform = `scale(${escalaNecesaria.toFixed(2)})`;
}

window.addEventListener("resize", function () {
    const contenedor = document.getElementById("fondoContinente");
    if (contenedor.childElementCount > 0) {
        Plotly.Plots.resize(contenedor).then(function () {
            ajustarEscalaFondo(contenedor);
        });
    }
});

/* =========================================================
   SELECTOR DE CONTINENTE: permite saltar de un continente a otro
   sin volver a escanear el QR. Cambia los datos, el gráfico, el
   fondo y el color de acento de la página al mismo tiempo.
   ========================================================= */

function inicializarSelectorContinentes() {
    const contenedor = document.getElementById("selectorContinentes");
    contenedor.innerHTML = "";

    const regionesEnDatos = new Set(datosCompletos.map(d => d.Region).filter(Boolean));
    const opciones = ["Todas", ...ORDEN_REGIONES.filter(r => regionesEnDatos.has(r))];

    opciones.forEach(opcion => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-continente";
        chip.dataset.region = opcion;

        const punto = document.createElement("span");
        punto.className = "chip-punto";
        punto.style.backgroundColor = colorDeRegion(opcion);

        const texto = document.createElement("span");
        texto.textContent = opcion === "Todas" ? "Todo el mundo" : opcion;

        chip.appendChild(punto);
        chip.appendChild(texto);
        chip.addEventListener("click", function () {
            cambiarRegion(opcion);
        });

        contenedor.appendChild(chip);
    });

    actualizarChipActivo();
}

function actualizarChipActivo() {
    document.querySelectorAll(".chip-continente").forEach(function (chip) {
        chip.classList.toggle("activo", chip.dataset.region === region);
    });
}

function cambiarRegion(nuevaRegion) {
    if (nuevaRegion === region) return;

    pausar();
    region = nuevaRegion;

    const url = new URL(window.location.href);
    if (region === "Todas") {
        url.searchParams.delete("region");
    } else {
        url.searchParams.set("region", region);
    }
    history.replaceState(null, "", url);

    document.getElementById("titulo").textContent =
        region === "Todas" ? "Todo el mundo" : region;
    document.documentElement.style.setProperty("--color-tema", colorDeRegion(region));

    calcularSerieAnual();
    inicializarGrafico();
    actualizarFrame(0);
    dibujarFondoContinente(region);
    actualizarChipActivo();
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

    if (playerHomicidio && playerHomicidio.state === "started") {
        playerHomicidio.stop();
    }
    if (playerSuicidio && playerSuicidio.state === "started") {
        playerSuicidio.stop();
    }
    categoriaSonandoActual = null;
}

/* =========================================================
   SONIFICACIÓN
   Grabaciones reales: una sirena policial para homicidio y un sonido
   de llanto/tristeza para suicidio. Cada año suena SOLO la categoría
   que predomina ese año (no las dos a la vez). Cada clip se deja sonar
   COMPLETO (los ~10s del llanto, los ~15.6s de la sirena): no se corta
   ni se reinicia hasta que termina solo. Por eso el sonido va a su
   propio ritmo, independiente de la velocidad del gráfico — si el
   mismo tipo de violencia sigue predominando año tras año, es normal
   que el audio recién cambie de año varios años después de lo que se
   ve en pantalla. El VOLUMEN sí se sigue actualizando con cada año
   (mientras el clip sigue sonando), para transmitir magnitud.
   ========================================================= */

const RUTA_AUDIO_HOMICIDIO = "data/audio/policia_sirena.mp3";
const RUTA_AUDIO_SUICIDIO = "data/audio/sonido_suicidio.m4a";

let categoriaSonandoActual = null; // "homicidio" | "suicidio" | null

async function cargarSonidos() {
    playerHomicidio = new Tone.Player().toDestination();
    playerSuicidio = new Tone.Player().toDestination();

    await Promise.all([
        playerHomicidio.load(RUTA_AUDIO_HOMICIDIO),
        playerSuicidio.load(RUTA_AUDIO_SUICIDIO)
    ]);
}

// Si el navegador/celular no puede decodificar alguno de los formatos de
// audio, la carga puede quedar colgada en vez de fallar. Con esto, después
// de unos segundos se cancela y se avisa el error en vez de dejar el botón
// "Cargando…" pegado para siempre.
function conTiempoLimite(promesa, milisegundos, mensaje) {
    return Promise.race([
        promesa,
        new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error(mensaje)); }, milisegundos);
        })
    ]);
}

function sonificarFrame(punto) {
    if (!sonidoListo) return;

    const maxValor = d3.max(serieAnual, d => Math.max(d.homicidio, d.suicidio)) || 1;

    const esHomicidio = punto.homicidio >= punto.suicidio;
    const categoria = esHomicidio ? "homicidio" : "suicidio";
    const player = esHomicidio ? playerHomicidio : playerSuicidio;
    const valor = esHomicidio ? punto.homicidio : punto.suicidio;

    const proporcion = Math.min(valor / maxValor, 1);
    player.volume.value = -24 + proporcion * 18; // más tasa ese año -> sonido más fuerte

    if (categoria !== categoriaSonandoActual) {
        // Cambió qué predomina: hay que cortar el clip anterior (si seguía
        // sonando) y arrancar el nuevo desde el principio.
        const playerAnterior = categoriaSonandoActual === "homicidio" ? playerHomicidio : playerSuicidio;
        if (playerAnterior && playerAnterior.state === "started") {
            playerAnterior.stop();
        }
        player.start();
        categoriaSonandoActual = categoria;
    } else if (player.state !== "started") {
        // Sigue predominando lo mismo, y el clip ya terminó su duración
        // completa: ahora sí se reinicia.
        player.start();
    }
    // Si sigue predominando lo mismo Y el clip todavía está sonando, no se
    // toca: se deja terminar completo (solo se actualizó el volumen arriba).
}
