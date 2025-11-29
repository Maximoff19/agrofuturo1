// AgroFuturo — Frontend conectado al backend FastAPI
// Usa los endpoints de backend para zonas de suelo, series de clima y algoritmos.

// Config API
const API_BASE = window.API_BASE || 'http://localhost:8000';

// Centro aproximado de Huancayo (Perú)
const HUANCAYO_CENTER = { lat: -12.07, lng: -75.21 };
const COSTO_M2_PEN = 2000;
const USD_TO_PEN = 3.75;
const CELL_LAT_RADIUS = 0.006; // fallback radio lat ~650 m
const CELL_LON_RADIUS = 0.0075; // fallback radio lon ~800 m
const PARCEL_MIN_DIST_BUFFER = 120; // margen adicional entre polígonos
let parcelCenters = []; // { lat, lng, radiusM }
const LOCAL_IMAGES = [
  'img/0-agro1-600x315.jpg',
  'img/1462872541.jpg',
  'img/1471468959.jpg',
  'img/1506421858.jpg',
  'img/1549142787.jpg',
  'img/309-1024x683.jpg',
  'img/310-1024x683.jpg',
  'img/323866336.jpg',
  'img/358239614.jpg',
  'img/79622_listaImagenes-3_1088x650xrecortarxagrandar.jpg',
  'img/images-2.jpeg',
  'img/images-3.jpeg',
  'img/images-4.jpeg',
  'img/images-5.jpeg',
  'img/images-6.jpeg',
  'img/images-7.jpeg',
  'img/images.jpeg',
  'img/importancia-barbecho.jpg',
  'img/thumb_1739595_photo_middle_standart.jpg'
];

// Colores para clusters K-Means
const CLUSTER_COLORS = ['#4ade80', '#60a5fa', '#f59e0b', '#a78bfa', '#fb7185', '#22d3ee'];

// Contorno aproximado del distrito de Huancayo (OSM, simplificado para la demo)
const HUANCAYO_OUTLINE = [
  [-12.06957, -75.23616], [-12.07562, -75.2355], [-12.07995, -75.23386],
  [-12.08664, -75.23264], [-12.08469, -75.2266], [-12.08285, -75.22198],
  [-12.08202, -75.21734], [-12.0804, -75.21273], [-12.07886, -75.20782],
  [-12.07638, -75.20331], [-12.07438, -75.19869], [-12.07217, -75.19453],
  [-12.07092, -75.1899], [-12.06941, -75.18461], [-12.06742, -75.18045],
  [-12.0643, -75.1763], [-12.06027, -75.17372], [-12.06049, -75.16917],
  [-12.05876, -75.16476], [-12.05729, -75.16032], [-12.05266, -75.15634],
  [-12.05015, -75.1523], [-12.04965, -75.14714], [-12.04875, -75.14247],
  [-12.04811, -75.13725], [-12.04727, -75.13253], [-12.04792, -75.12636],
  [-12.04585, -75.12082], [-12.04721, -75.11623], [-12.05173, -75.11368],
  [-12.05542, -75.11035], [-12.05924, -75.10091], [-12.05815, -75.09641],
  [-12.05712, -75.09169], [-12.05669, -75.08554], [-12.05206, -75.08627],
  [-12.0491, -75.08198], [-12.04441, -75.07824], [-12.04016, -75.07539],
  [-12.03662, -75.07185], [-12.03615, -75.06735], [-12.03112, -75.06744],
  [-12.02654, -75.06538], [-12.02364, -75.06192], [-12.01955, -75.05807],
  [-12.01539, -75.0535], [-12.01205, -75.04812], [-12.00714, -75.04815],
  [-11.99985, -75.04926], [-11.99837, -75.04393], [-11.99925, -75.03609],
  [-12.0019, -75.03206], [-12.00215, -75.02756], [-12.00471, -75.02291],
  [-12.00926, -75.02138], [-12.01204, -75.01729], [-12.0112, -75.01261],
  [-12.01545, -75.0108], [-12.01781, -75.00606], [-12.01873, -75.00138],
  [-12.02113, -74.99724], [-12.01846, -74.99351], [-12.01736, -74.98865],
  [-12.01879, -74.98315], [-12.01974, -74.97852], [-12.02297, -74.97515],
  [-12.02346, -74.97035], [-12.02456, -74.96563], [-12.02312, -74.96009],
  [-12.01968, -74.95675], [-12.01581, -74.95263], [-12.01039, -74.95113],
  [-12.00575, -74.94937], [-12.00012, -74.94812], [-11.99494, -74.94664],
  [-11.98976, -74.95018], [-11.98363, -74.95279], [-11.97845, -74.95408],
  [-11.97476, -74.95855], [-11.97105, -74.96464], [-11.96671, -74.96684],
  [-11.96094, -74.96909], [-11.95896, -74.9734], [-11.95934, -74.97844],
  [-11.95456, -74.97997], [-11.95245, -74.98414], [-11.94779, -74.98378],
  [-11.94426, -74.98774], [-11.9417, -74.99277], [-11.93809, -74.99755],
  [-11.93127, -75.00094], [-11.92602, -75.00481], [-11.92331, -75.00861],
  [-11.92137, -75.01296], [-11.92115, -75.01851], [-11.92272, -75.02347],
  [-11.92227, -75.02848], [-11.92076, -75.03374], [-11.91888, -75.03891],
  [-11.9184, -75.04361], [-11.91414, -75.04817], [-11.91038, -75.05081],
  [-11.90522, -75.0534], [-11.90263, -75.05728], [-11.90143, -75.06195],
  [-11.90257, -75.06928], [-11.90405, -75.07382], [-11.90737, -75.07687],
  [-11.90909, -75.08143], [-11.91127, -75.08585], [-11.91532, -75.08863],
  [-11.91951, -75.09132], [-11.92286, -75.09524], [-11.92769, -75.09475],
  [-11.93347, -75.09303], [-11.93883, -75.09409], [-11.94395, -75.09441],
  [-11.94849, -75.0924], [-11.95188, -75.08821], [-11.95616, -75.08497],
  [-11.96155, -75.08182], [-11.96649, -75.08034], [-11.97132, -75.08233],
  [-11.97559, -75.08553], [-11.97872, -75.08933], [-11.97918, -75.09403],
  [-11.98266, -75.09721], [-11.98464, -75.10158], [-11.98847, -75.10455],
  [-11.99076, -75.10944], [-11.99347, -75.11343], [-11.9962, -75.11708],
  [-12.00116, -75.11843], [-12.00385, -75.12213], [-12.00717, -75.1263],
  [-12.01019, -75.12978], [-12.00977, -75.13486], [-12.00687, -75.13841],
  [-12.00542, -75.14279], [-12.00322, -75.14705], [-12.00438, -75.15224],
  [-12.00471, -75.15769], [-12.00468, -75.16232], [-12.00742, -75.16745],
  [-12.00994, -75.17129], [-12.01176, -75.17589], [-12.01258, -75.18245],
  [-12.01545, -75.18617], [-12.01926, -75.18946], [-12.02262, -75.19362],
  [-12.02624, -75.19651], [-12.03078, -75.19821], [-12.03552, -75.19891],
  [-12.0405, -75.19868], [-12.04543, -75.19928], [-12.0496, -75.20195],
  [-12.05268, -75.20529], [-12.05701, -75.2073], [-12.06085, -75.20991],
  [-12.06491, -75.21217], [-12.06807, -75.21563], [-12.07063, -75.21946],
  [-12.07153, -75.22387], [-12.06993, -75.22887], [-12.06971, -75.23442],
  [-12.06957, -75.23616]
];

// Estado global cargado desde el backend
let ZONAS = [];
let LISTINGS = [];
let visibleListings = [];
let selectedListingId = null;
let kmeansResult = null;
let climateSeries = { TT: [], RR: [] };
let loadingState = false;

// Mapa principal (Google Maps)
let map;
let zonaLayers = {};
let currentLayerMode = 'aptitud';
let routeLayerGroup = [];
let huancayoOutlineLayer;
let outlineBounds;
let infoWindow;
let routeInfoWindow;
let directionsService;
let routeRequestToken = 0;
let listingMarkers = [];
let listingPolygons = [];

// UI state
let lastParams = { presupuesto: 5000, objetivo: 'equilibrado' };

// --- Fetch y mapping desde backend ---
async function fetchJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.json();
}

function buildClusterLookup(kmeans){
  const lookup = {};
  if (!kmeans?.clusters) return lookup;
  kmeans.clusters.forEach((c, idx) => {
    const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
    (c.members || []).forEach(m => lookup[m] = color);
  });
  return lookup;
}

function climateSnapshot(){
  const tt = climateSeries.TT || [];
  const rr = climateSeries.RR || [];
  const avg = (arr) => arr.length ? arr.reduce((s,x) => s + (Number(x.value) || 0), 0) / arr.length : 0;
  return {
    tmed: avg(tt) || 17.4,
    lluvia: avg(rr) || 90,
    helada: 0.1,
    viento: 7.2
  };
}

function metersToLat(m){ return m / 111000; }
function metersToLon(m, lat){ return m / (111000 * Math.cos(lat * Math.PI / 180)); }

function parcelRadiusFromCost(costoHa){
  const safeCost = Math.max(800, Math.min(2600, costoHa || 1500));
  const base = 2000 / safeCost * 120; // menor costo = mayor radio
  return Math.max(70, Math.min(240, base));
}

function allocateParcelCenter(lat, lon, radiusM, idx){
  const minDist = radiusM * 2 + PARCEL_MIN_DIST_BUFFER;
  const maxAttempts = 60;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
  for (let attempt = 0; attempt < maxAttempts; attempt++){
    const scale = 1 + attempt * 0.08;
    const r = minDist * scale;
    const theta = (idx + attempt) * goldenAngle;
    const dxM = Math.cos(theta) * r;
    const dyM = Math.sin(theta) * r;
    const cLat = lat + metersToLat(dyM);
    const cLon = lon + metersToLon(dxM, lat);
    const tooClose = parcelCenters.some(pt => {
      const d = haversine({ lat: pt.lat, lng: pt.lng }, { lat: cLat, lng: cLon }) * 1000;
      return d < (pt.radiusM + radiusM + PARCEL_MIN_DIST_BUFFER);
    });
    if (!tooClose){
      parcelCenters.push({ lat: cLat, lng: cLon, radiusM });
      return { lat: cLat, lng: cLon };
    }
  }
  // fallback: desplaza en línea recta al este
  const fallbackLat = lat;
  const fallbackLon = lon + metersToLon(minDist * 1.5, lat);
  parcelCenters.push({ lat: fallbackLat, lng: fallbackLon, radiusM });
  return { lat: fallbackLat, lng: fallbackLon };
}

function buildParcel(centerLat, centerLng, radiusM){
  const dl = metersToLat(radiusM);
  const dn = metersToLon(radiusM * 1.2, centerLat);
  return {
    center: { lat: centerLat, lng: centerLng },
    poly: [
      [centerLat + dl, centerLng - dn],
      [centerLat + dl * 0.4, centerLng + dn * 0.9],
      [centerLat - dl * 0.6, centerLng + dn * 0.6],
      [centerLat - dl, centerLng - dn * 0.4],
      [centerLat, centerLng - dn * 1.05]
    ]
  };
}

function mapZoneFromApi(z, idx, colorLookup, clima){
  const fert = clamp(Number(z.soil_score ?? 0.55), 0, 1);
  const drenaje = clamp(1 - (Number(z.pendiente_pct ?? 0) / 100), 0, 1);
  const suelo = {
    tipo: z.textura_clase || 'Suelo local',
    ph: Number(z.pH ?? 6.5),
    om: Number(z.MO_pct ?? 3),
    fertilidad: fert,
    drenaje
  };
  const color = colorLookup[z.distrito] || CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
  const rendimiento = 2.5 + fert * 2;
  const riesgo = clamp(1 - fert, 0.05, 0.4);
  const costoHa = Math.round(1200 + (1 - fert) * 800);
  const lat = Number(z.lat);
  const lon = Number(z.lon);
  const radiusM = parcelRadiusFromCost(costoHa);
  const center = allocateParcelCenter(lat, lon, radiusM, idx);
  const parcel = buildParcel(center.lat, center.lng, radiusM);

  return {
    id: z.distrito,
    nombre: z.distrito,
    color,
    pol: parcel.poly,
    suelo,
    clima,
    costoHa,
    rendimiento,
    riesgo,
    ventanas: [],
    lat: parcel.center.lat,
    lng: parcel.center.lng,
    soil_score: fert,
    provincia: z.provincia,
    muestras: z.muestras,
    pendiente_pct: Number(z.pendiente_pct ?? 0),
    pH: Number(z.pH ?? 6.5),
    MO_pct: Number(z.MO_pct ?? 3),
    CEC_cmol_kg: Number(z.CEC_cmol_kg ?? 0),
    N_total_pct: Number(z.N_total_pct ?? 0),
    P_disponible_mg_kg: Number(z.P_disponible_mg_kg ?? 0),
    K_intercambiable_mg_kg: Number(z.K_intercambiable_mg_kg ?? 0),
    indice_calidad_suelo: Number(z.indice_calidad_suelo ?? 0)
  };
}

function zoneToListing(z, idx){
  const priceUsd = Math.round(500 + (1 - z.soil_score) * 700 + idx * 8);
  const pricePen = Math.round(priceUsd * USD_TO_PEN);
  const photo = LOCAL_IMAGES[idx % LOCAL_IMAGES.length] || LOCAL_IMAGES[0];
  return {
    id: z.id,
    titulo: z.nombre,
    direccion: `${z.provincia || 'Huancayo'} · ${z.nombre}`,
    pricePen,
    priceUsd,
    mantenimiento: Math.round(pricePen * 0.08),
    meta: `${(z.soil_score * 100).toFixed(0)} pts suelo · ${z.muestras || '?'} muestras`,
    detalle: `pH ${z.suelo.ph.toFixed(1)} · MO ${z.suelo.om?.toFixed(1) ?? '--'}% · Pendiente ${(z.pendiente_pct || 0).toFixed(1)}%`,
    photo,
    badge: 'Suelo optimizado',
    color: z.color,
    suelo: z.suelo,
    clima: z.clima,
    costoHa: z.costoHa,
    rendimiento: z.rendimiento,
    riesgo: z.riesgo,
    ventanas: z.ventanas,
    lat: z.lat,
    lng: z.lng,
    poly: z.pol,
    soil_score: z.soil_score,
    muestras: z.muestras,
    pendiente_pct: z.pendiente_pct,
    pH: z.pH,
    MO_pct: z.MO_pct,
    CEC_cmol_kg: z.CEC_cmol_kg,
    N_total_pct: z.N_total_pct,
    P_disponible_mg_kg: z.P_disponible_mg_kg,
    K_intercambiable_mg_kg: z.K_intercambiable_mg_kg,
    indice_calidad_suelo: z.indice_calidad_suelo
  };
}

async function bootstrapData(){
  setLoading(true);
  try {
    const [zonesRes, kmeansRes, tempSeries, rainSeries, sortRes] = await Promise.all([
      fetchJSON(`${API_BASE}/soil/zones?limit=40`),
      fetchJSON(`${API_BASE}/algorithms/kmeans?k=4`).catch(() => null),
      fetchJSON(`${API_BASE}/climate/timeseries?metric=TT&limit=240`).catch(() => ({ series: [] })),
      fetchJSON(`${API_BASE}/climate/timeseries?metric=RR&limit=240`).catch(() => ({ series: [] })),
      fetchJSON(`${API_BASE}/algorithms/sort?dataset=soil&metric=soil_score&method=quicksort&limit=200`).catch(() => null)
    ]);
    kmeansResult = kmeansRes;
    climateSeries = { TT: tempSeries?.series || [], RR: rainSeries?.series || [] };
    const colorLookup = buildClusterLookup(kmeansRes);
    parcelCenters = []; // reset para evitar arrastrar offsets de renders previos
    const ordered = sortRes?.items?.map(i => i.label) || [];
    const clima = climateSnapshot();
    const zones = (zonesRes?.zones || []).map((z, idx) => mapZoneFromApi(z, idx, colorLookup, clima));
    // Ordenar por ranking del backend si llega
    zones.sort((a, b) => {
      const pa = ordered.indexOf(a.id);
      const pb = ordered.indexOf(b.id);
      if (pa === -1 && pb === -1) return b.soil_score - a.soil_score;
      if (pa === -1) return 1;
      if (pb === -1) return -1;
      return pa - pb;
    });
    ZONAS = zones;
    LISTINGS = zones.map((z, idx) => zoneToListing(z, idx));
    visibleListings = LISTINGS.slice();
    selectedListingId = visibleListings[0]?.id || null;
    applyListingFilter();
    renderCharts();
    renderRankingPlaceholder();
    fitMapToData();
  } catch (err) {
    console.error('Error cargando datos del backend', err);
    setText('mapCounter', 'Error cargando backend');
    clearListingCard();
  } finally {
    setLoading(false);
  }
}

function setLoading(state){
  loadingState = state;
  const counter = document.getElementById('mapCounter');
  if (counter) counter.textContent = state ? 'Cargando datos...' : 'Zonas listas';
}

// --- Utils ---
function toLatLngPath(poly){ return poly.map(([lat, lng]) => ({ lat, lng })); }
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

// Índices de aptitud
function soilIndex(z){
  if (z.soil_score) return clamp(z.soil_score, 0, 1);
  return clamp((z.suelo.fertilidad * 0.6) + (z.suelo.om/4 * 0.3) + (z.suelo.drenaje * 0.1), 0, 1);
}
function climateIndex(z){
  const clima = z.clima || { tmed: 17.5, lluvia: 90, helada: 0.1 };
  return clamp(1 - Math.abs(clima.tmed - 17.5)/8, 0, 1) * 0.5
       + clamp((100 - Math.abs(90 - clima.lluvia))/100, 0, 1) * 0.3
       + clamp(1 - (clima.helada ?? 0.1), 0, 1) * 0.2;
}
function aptitudZona(z, objetivo='equilibrado'){
  const sueloScore = soilIndex(z);
  const climaScore = climateIndex(z);
  const riesgo = z.riesgo ?? 0.2;
  let wSo = 0.5, wCl = 0.4, wRi = 0.1;
  if (objetivo === 'rendimiento') { wSo = 0.55; wCl = 0.4; wRi = 0.05; }
  if (objetivo === 'riesgo') { wSo = 0.35; wCl = 0.35; wRi = 0.3; }
  return clamp(wSo*sueloScore + wCl*climaScore + wRi*(1-riesgo), 0, 1);
}
function aptitudListing(l, objetivo='equilibrado'){ return aptitudZona(l, objetivo); }

// Punto dentro de polígono (ray casting simple)
function pointInPoly(pt, poly){
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++){
    const xi = poly[i][1], yi = poly[i][0];
    const xj = poly[j][1], yj = poly[j][0];
    const intersect = ((yi > pt.lat) !== (yj > pt.lat)) &&
      (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// ---------- Mapa ----------
function initMap(){
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: HUANCAYO_CENTER.lat, lng: HUANCAYO_CENTER.lng },
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    backgroundColor: '#0b0f14'
  });

  infoWindow = new google.maps.InfoWindow();
  routeInfoWindow = new google.maps.InfoWindow();
  directionsService = new google.maps.DirectionsService();
  routeLayerGroup = [];

  const outlinePath = toLatLngPath(HUANCAYO_OUTLINE);
  huancayoOutlineLayer = new google.maps.Polyline({
    path: outlinePath,
    strokeColor: '#60a5fa',
    strokeOpacity: 1,
    strokeWeight: 3,
    map: null,
    visible: false,
    zIndex: 3
  });
  outlineBounds = new google.maps.LatLngBounds();
  outlinePath.forEach(pt => outlineBounds.extend(pt));
  buildLegend();
}

function drawZoneOverlays(zones = ZONAS){
  // Desactivado para evitar superposición masiva; se dibuja sólo el polígono seleccionado
  Object.values(zonaLayers).forEach(layer => layer.setMap(null));
  zonaLayers = {};
}

function focusZona(id){
  const z = ZONAS.find(x => x.id === id);
  const poly = zonaLayers[id];
  if (!z || !poly) return;
  const bounds = new google.maps.LatLngBounds();
  poly.getPath().forEach(latLng => bounds.extend(latLng));
  map.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });
  const apt = aptitudZona(z, getObjetivo());
  const popup = `
    <b>${z.nombre}</b><br/>
    Suelo: ${z.suelo.tipo} · pH ${z.suelo.ph.toFixed(1)} · MO ${z.suelo.om.toFixed(1)}%<br/>
    CEC aprox: ${z.CEC_cmol_kg ? z.CEC_cmol_kg.toFixed(1) : '—'} · Pendiente ${(z.pendiente_pct||0).toFixed(1)}%<br/>
    Aptitud estimada: ${(apt*100).toFixed(0)}%
  `;
  const center = centroid(z.pol);
  infoWindow.setContent(popup);
  infoWindow.setPosition(center);
  infoWindow.open({ map });
}

function updateLayerColors(){
  if (!zonaLayers || !Object.keys(zonaLayers).length) {
    buildLegend();
    return;
  }
  buildLegend();
}

function getObjetivo(){
  return document.getElementById('objetivo').value;
}

// Leyenda dinámica según capa
function buildLegend(){
  const legendScale = document.getElementById('legendScale');
  if (!legendScale) return;
  legendScale.innerHTML = '';
}

// ---------- Marcadores y polígonos ----------
function formatPenLabel(val){
  if (!val && val !== 0) return 'S/ —';
  if (val >= 9500) return `S/ ${(val/1000).toFixed(0)}K`;
  if (val >= 1000) return `S/ ${(val/1000).toFixed(1)}K`;
  return `S/ ${val.toLocaleString()}`;
}

function budgetUsd(){
  const input = (document.getElementById('presupuesto')?.value || '').toString().trim();
  if (!input) return Infinity;
  const cleaned = input.replace(/,/g, '').replace(/[^\d.\-kKmM]/g, '');
  let raw = parseFloat(cleaned);
  if (!Number.isFinite(raw)) return Infinity;
  if (/k$/i.test(cleaned)) raw = raw * 1000;
  // Heurística: valores altos se interpretan en PEN y se convierten a USD
  return raw > 2000 ? raw / USD_TO_PEN : raw;
}

function filterListingsByBudget(budget){
  if (!Number.isFinite(budget)) return LISTINGS.slice();
  return LISTINGS.filter(l => l.priceUsd <= budget);
}

function listingPolyPath(listing){
  if (listing.poly) return toLatLngPath(listing.poly);
  const deltaLat = 0.0025 + Math.random()*0.0015;
  const deltaLng = 0.003 + Math.random()*0.0015;
  const { lat, lng } = listing;
  return toLatLngPath([
    [lat + deltaLat, lng - deltaLng],
    [lat + deltaLat*0.4, lng + deltaLng*0.8],
    [lat - deltaLat*0.6, lng + deltaLng*0.6],
    [lat - deltaLat, lng - deltaLng*0.5],
    [lat, lng - deltaLng*1.1]
  ]);
}

function buildPriceMarkerIcon(listing, active=false){
  const label = formatPenLabel(listing.pricePen);
  const base = listing.color || '#f97316';
  const color = active ? '#ff6b3d' : base;
  const darker = shade(color, -35);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="112" height="76" viewBox="0 0 112 76">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <path d="M16 10 C6 10 2 17 2 24 L2 46 C2 53 6 60 16 60 L96 60 C106 60 110 53 110 46 L110 24 C110 17 106 10 96 10 Z" fill="${color}" />
      <path d="M54 60 L62 72 L46 60 Z" fill="${color}" />
      <rect x="8" y="16" rx="9" ry="9" width="96" height="32" fill="${shade(color, 25)}" opacity="0.16"/>
      <text x="56" y="35" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="800" fill="#0a1f17">${label}</text>
      <text x="56" y="51" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="600" fill="${darker}">${listing.badge || 'Disponible'}</text>
    </g>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    anchor: new google.maps.Point(56, 72),
    scaledSize: new google.maps.Size(112, 76)
  };
}

function drawListingMarkers(list = visibleListings){
  listingMarkers.forEach(m => m.marker.setMap(null));
  listingMarkers = list.map((listing, idx) => {
    const marker = new google.maps.Marker({
      position: { lat: listing.lat, lng: listing.lng },
      map,
      icon: buildPriceMarkerIcon(listing, selectedListingId === listing.id),
      zIndex: selectedListingId === listing.id ? 60 : 30 + idx
    });
    marker.addListener('click', () => selectListing(listing.id, true));
    return { id: listing.id, marker };
  });
}

function refreshListingMarkers(){
  listingMarkers.forEach(({ id, marker }) => {
    const listing = visibleListings.find(l => l.id === id);
    if (!listing) return;
    marker.setIcon(buildPriceMarkerIcon(listing, id === selectedListingId));
    marker.setZIndex(id === selectedListingId ? 60 : 30);
  });
}

function drawListingPolygons(list = visibleListings){
  listingPolygons.forEach(p => p.poly.setMap(null));
  listingPolygons = list.map((listing, idx) => {
    const poly = new google.maps.Polygon({
      paths: listingPolyPath(listing),
      strokeColor: shade(listing.color, -40),
      strokeOpacity: 0.8,
      strokeWeight: listing.id === selectedListingId ? 2.4 : 1.1,
      fillColor: listing.color,
      fillOpacity: listing.id === selectedListingId ? 0.2 : 0.08,
      map,
      zIndex: listing.id === selectedListingId ? 30 : 10 + idx
    });
    poly.addListener('click', () => selectListing(listing.id, true));
    return { id: listing.id, poly };
  });
}

function refreshListingPolygons(){
  listingPolygons.forEach(({ id, poly }) => {
    const listing = visibleListings.find(l => l.id === id);
    if (!listing) return;
    poly.setOptions({
      strokeWeight: id === selectedListingId ? 2.4 : 1.1,
      fillOpacity: id === selectedListingId ? 0.2 : 0.08,
      fillColor: listing.color,
      strokeColor: shade(listing.color, -40)
    });
  });
}

function selectListing(id, center=false){
  const listing = visibleListings.find(l => l.id === id);
  if (!listing) return;
  selectedListingId = id;
  updateListingCard(listing);
  refreshListingMarkers();
  refreshListingPolygons();
  renderListingPills(visibleListings);
  renderMetricsPanel(listing);
  renderCharts();
  if (center && map) map.panTo({ lat: listing.lat, lng: listing.lng });
}

function updateListingCard(listing){
  setText('listingTitle', listing.titulo);
  setText('listingAddress', listing.direccion);
  setText('listingPrice', `${formatPenLabel(listing.pricePen)} · USD ${listing.priceUsd.toLocaleString()}`);
  setText('listingMaintenance', listing.mantenimiento ? `S/ ${listing.mantenimiento} mantenimiento` : 'Mantenimiento incluido');
  setText('listingMeta', listing.meta || '');
  const su = listing.suelo;
  const cl = listing.clima;
  const resumenSuelo = su ? `${su.tipo} · pH ${su.ph.toFixed(1)} · MO ${su.om.toFixed(1)}% · Drenaje ${(su.drenaje*100|0)}%` : '';
  const resumenClima = cl ? `Tmed ${cl.tmed.toFixed(1)}°C · Lluvia ${cl.lluvia.toFixed(1)} mm · Helada ${(cl.helada*100).toFixed(0)}%` : '';
  setText('listingDetail', `${listing.detalle || ''}${resumenSuelo ? '\n' + resumenSuelo : ''}${resumenClima ? '\n' + resumenClima : ''}`);
  renderListingMetrics(listing);
  const badge = document.getElementById('listingBadge');
  if (badge) {
    badge.textContent = listing.badge || 'Disponible';
    badge.hidden = !listing.badge;
  }
  const img = document.getElementById('listingThumb');
  if (img && listing.photo) {
    img.src = listing.photo;
    img.alt = listing.titulo;
  }
}

function renderListingPills(list = visibleListings){
  const wrap = document.getElementById('listingPills');
  if (!wrap) return;
  wrap.innerHTML = '';
  const count = document.getElementById('listingCount');
  const counter = document.getElementById('mapCounter');
  if (count) count.textContent = list.length;
  if (counter) counter.textContent = list.length ? `${list.length} zonas cargadas del backend` : (loadingState ? 'Cargando...' : 'Sin coincidencias');
  list.slice(0, 6).forEach(listing => {
    const btn = document.createElement('button');
    btn.className = `pill small ${listing.id === selectedListingId ? 'active' : ''}`;
    btn.textContent = `${formatPenLabel(listing.pricePen)} · ${listing.direccion.split('·')[0].trim()}`;
    btn.addEventListener('click', () => selectListing(listing.id, true));
    wrap.appendChild(btn);
  });
}

function renderListingMetrics(listing){
  const wrap = document.getElementById('listingMetrics');
  if (!wrap) return;
  fillMetricsChips(wrap, listing);
}

function renderMetricsPanel(listing){
  const wrap = document.getElementById('metricsPanel');
  if (!wrap) return;
  fillMetricsChips(wrap, listing);
}

function clearMetricsPanel(){
  const wrap = document.getElementById('metricsPanel');
  if (wrap) wrap.innerHTML = 'Sin métricas';
}

function fillMetricsChips(wrap, listing){
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!listing) { wrap.textContent = 'Sin métricas'; return; }
  const metrics = [
    { label: 'Suelo', value: `${Math.round((listing.soil_score ?? soilIndex(listing))*100)}%`, color: '#4ade80' },
    { label: 'pH', value: listing.pH?.toFixed(1), color: '#60a5fa' },
    { label: 'MO %', value: listing.MO_pct?.toFixed(1), color: '#f59e0b' },
    { label: 'CEC', value: listing.CEC_cmol_kg?.toFixed(1), color: '#a78bfa' },
    { label: 'N %', value: listing.N_total_pct?.toFixed(2), color: '#22d3ee' },
    { label: 'P mg/kg', value: listing.P_disponible_mg_kg?.toFixed(1), color: '#fb7185' },
    { label: 'K mg/kg', value: listing.K_intercambiable_mg_kg?.toFixed(1), color: '#34d399' },
    { label: 'Pend %', value: listing.pendiente_pct?.toFixed(1), color: '#f97316' },
    { label: 'Muestras', value: listing.muestras ?? '-', color: '#eab308' },
    { label: 'Calidad', value: listing.indice_calidad_suelo ? `${listing.indice_calidad_suelo.toFixed(0)}` : '-', color: '#c084fc' }
  ];
  metrics.filter(m => m.value !== undefined && m.value !== null && m.value !== 'NaN').forEach(m => {
    const chip = document.createElement('div');
    chip.className = 'metric-chip';
    chip.innerHTML = `<span class="dot" style="background:${m.color}"></span><span>${m.label}</span><strong>${m.value}</strong>`;
    wrap.appendChild(chip);
  });
}

function renderRanking(list = visibleListings){
  const wrap = document.getElementById('rankingList');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.hidden = true;
  const placeholder = document.getElementById('rankingPlaceholder');
  if (placeholder) placeholder.hidden = false;
  if (!list.length) { wrap.textContent = 'Sin resultados'; return; }
  const presupuesto = budgetUsd();
  const objetivo = getObjetivo();
  const ranked = evalListings(list, presupuesto, objetivo).slice(0, 6);
  ranked.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'ranking-item';
    row.innerHTML = `
      <div class="ranking-main">
        <div class="ranking-title">${idx+1}. ${item.l.titulo}</div>
        <div class="ranking-meta">Score ${(item.score*100).toFixed(0)}% · ROI ${Math.round(item.roi*100)}% · Apt ${Math.round(item.apt*100)}%</div>
      </div>
      <div class="pill small">${formatPenLabel(item.l.pricePen)}</div>
    `;
    row.addEventListener('click', () => selectListing(item.l.id, true));
    wrap.appendChild(row);
  });
  wrap.hidden = false;
  if (placeholder) placeholder.hidden = true;
}

function renderRankingPlaceholder(){
  const wrap = document.getElementById('rankingList');
  const placeholder = document.getElementById('rankingPlaceholder');
  if (wrap) { wrap.innerHTML = ''; wrap.hidden = true; }
  if (placeholder) placeholder.hidden = false;
}

function clearListingCard(){
  setText('listingPrice', 'Sin resultados para este presupuesto');
  setText('listingMaintenance', '');
  setText('listingTitle', 'Ajusta el presupuesto o limpia filtros');
  setText('listingAddress', '');
  setText('listingMeta', '');
  setText('listingDetail', '');
  const img = document.getElementById('listingThumb');
  if (img) { img.src = ''; img.alt = 'Sin resultados'; }
  const badge = document.getElementById('listingBadge');
  if (badge) badge.hidden = true;
  clearMetricsPanel();
}

// Color scale (verde-amarillo-naranja-rojo)
function colorScale(t){
  const stops = [
    [0,   [56, 189, 248]],
    [0.33,[74, 222, 128]],
    [0.66,[245, 158, 11]],
    [1,   [239, 68, 68]]
  ];
  const i = stops.findIndex(s => t <= s[0]);
  if (i <= 0) return rgb(stops[0][1]);
  const [t2, c2] = stops[i];
  const [t1, c1] = stops[i-1];
  const f = (t - t1) / (t2 - t1);
  const c = [0,1,2].map(k => Math.round(c1[k] + f*(c2[k]-c1[k])));
  return rgb(c);
}
function rgb([r,g,b]){ return `rgb(${r}, ${g}, ${b})`; }
function shade(hex, amt){
  if (hex.startsWith('rgb')){
    const m = hex.match(/rgb\((\d+),\s?(\d+),\s?(\d+)\)/);
    if (!m) return hex; const [r,g,b] = m.slice(1).map(Number);
    return `rgb(${r+amt}, ${g+amt}, ${b+amt})`;
  }
  let c = hex.replace('#','');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt; let g = ((num >> 8) & 0x00FF) + amt; let b = (num & 0x0000FF) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Recomendación por presupuesto
function recomendar(presupuesto, objetivo){
  const pool = filterListingsByBudget(presupuesto);
  if (!pool.length) return null;
  const evaluadas = evalListings(pool, presupuesto, objetivo);
  return evaluadas[0];
}

function evalListings(list, presupuesto, objetivo){
  const evaluadas = list.map(l => {
    const apt = aptitudListing(l, objetivo);
    const has = Math.max(0.3, Math.floor((presupuesto / l.costoHa) * 10) / 10);
    const ingresoPorHa = l.rendimiento * 800;
    const margenPorHa = ingresoPorHa - l.costoHa * 0.6;
    const roi = clamp((margenPorHa / Math.max(1,l.costoHa)), -0.5, 1.5);
    const score = apt * (1 - (l.riesgo ?? 0.2)*0.6) * (1 + roi*0.4);
    const mejorVentana = l.ventanas?.[0];
    return { l, apt, has, roi, score, mejorVentana };
  });
  evaluadas.sort((a,b) => b.score - a.score);
  return evaluadas;
}

// Gráficos con Chart.js (suelo y clima desde backend)
let chartSuelo, chartDetalle;
function renderCharts(){
  const ctx1 = document.getElementById('chartSuelo');
  const ctx3 = document.getElementById('chartDetalle');
  const sel = visibleListings.find(l => l.id === selectedListingId) || visibleListings[0] || LISTINGS[0];

  chartSuelo?.destroy();
  chartDetalle?.destroy?.();

  if (!sel) return;

  if (typeof Chart === 'undefined') {
    renderChartsFallback(sel);
    return;
  }

  chartSuelo = new Chart(ctx1, {
    type: 'radar',
    data: {
      labels: ['Fertilidad','MO','Drenaje','pH óptimo'],
      datasets: [{
        label: sel.titulo,
        data: [sel.suelo.fertilidad, sel.suelo.om/4, sel.suelo.drenaje, phScore(sel.suelo.ph)],
        borderColor: sel.color, backgroundColor: hexOrRgbToRgba(sel.color, 0.2), pointBackgroundColor: sel.color
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: '#223043' }, grid: { color: '#223043' }, pointLabels: { color: '#98a3b4' }, ticks: { display:false } } }, plugins: { legend: { labels: { color: '#e9eef6' } } } }
  });

  if (ctx3) {
    chartDetalle = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: ['pH','MO %','CEC','N %','P','K','Pend %','Calidad'],
        datasets: [{
          label: `Métricas ${sel.titulo}`,
          backgroundColor: [
            hexOrRgbToRgba(sel.color, 0.85),
            '#f59e0b',
            '#a78bfa',
            '#22d3ee',
            '#fb7185',
            '#34d399',
            '#f97316',
            '#c084fc'
          ],
          data: [
            sel.pH ?? null,
            sel.MO_pct ?? null,
            sel.CEC_cmol_kg ?? null,
            sel.N_total_pct ?? null,
            sel.P_disponible_mg_kg ?? null,
            sel.K_intercambiable_mg_kg ?? null,
            sel.pendiente_pct ?? null,
            sel.indice_calidad_suelo ?? null
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color:'#e9eef6' } } },
        scales: {
          x: { ticks: { color:'#98a3b4' }, grid: { color:'#223043' } },
          y: { ticks: { color:'#98a3b4' }, grid: { color:'#223043' } }
        }
      }
    });
  }

  const legend = document.getElementById('zonaLegend');
  legend.innerHTML = '';
  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.innerHTML = `<span class="dot" style="background:${sel.color}"></span>${sel.titulo}`;
  legend.appendChild(chip);

  ctx1.parentElement.style.display = '';
  ctx3.parentElement.style.display = '';
}

// Fallback de métricas sin Chart.js (barras simples HTML/CSS)
function renderChartsFallback(sel){
  const grid = document.querySelector('.charts-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!sel) return;

  const soilCard = document.createElement('div');
  soilCard.className = 'chart-card';
  soilCard.innerHTML = `<div class="card-title">Suelo</div>`;
  const idx = Math.round(soilIndex(sel) * 100);
  const row = document.createElement('div');
  row.className = 'hbar';
  row.innerHTML = `
    <div class="label">${sel.titulo}</div>
    <div class="track"><div class="fill" style="width:${idx}%;background:${sel.color}"></div></div>
    <div class="value">${idx}%</div>
  `;
  const sub = document.createElement('div');
  sub.className = 'chart-subtext muted';
  sub.textContent = `Tipo ${sel.suelo.tipo} · pH ${sel.suelo.ph.toFixed(1)} · MO ${sel.suelo.om.toFixed(1)}% · Drenaje ${(sel.suelo.drenaje*100|0)}%`;
  soilCard.appendChild(row);
  soilCard.appendChild(sub);

  const barCard = document.createElement('div');
  barCard.className = 'chart-card';
  barCard.innerHTML = `<div class="card-title">Detalles</div>`;
  const metrics = [
    ['pH', sel.pH],
    ['MO %', sel.MO_pct],
    ['CEC', sel.CEC_cmol_kg],
    ['N %', sel.N_total_pct],
    ['P', sel.P_disponible_mg_kg],
    ['K', sel.K_intercambiable_mg_kg],
    ['Pend %', sel.pendiente_pct],
    ['Calidad', sel.indice_calidad_suelo]
  ];
  metrics.forEach(([label, val]) => {
    if (val === undefined || val === null || Number.isNaN(val)) return;
    const r = document.createElement('div');
    r.className = 'hbar';
    r.innerHTML = `
      <div class="label">${label}</div>
      <div class="track"><div class="fill" style="width:${Math.min(100, Number(val) * 3)}%;background:${sel.color}"></div></div>
      <div class="value">${Number(val).toFixed(1)}</div>
    `;
    barCard.appendChild(r);
  });

  grid.appendChild(soilCard);
  grid.appendChild(barCard);
}

function phScore(ph){
  const d = Math.abs(6.65 - ph);
  return clamp(1 - d/2, 0, 1);
}

function hexOrRgbToRgba(c, a){
  if (c.startsWith('rgb')) return c.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
  const num = parseInt(c.replace('#',''), 16);
  const r = num >> 16; const g = (num>>8) & 255; const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// UI handlers
function initUI(){
  document.getElementById('calcularBtn').addEventListener('click', async () => {
    const presupuesto = parseFloat(document.getElementById('presupuesto').value || '0');
    const objetivo = getObjetivo();
    lastParams = { presupuesto, objetivo };
    const res = recomendar(presupuesto, objetivo);
    if (!res) {
      clearListingCard();
      return;
    }
    const { l, has, roi, mejorVentana } = res;
    document.getElementById('recoResumen').hidden = true;
    document.getElementById('recoGrid').hidden = false;
    setText('kpiZona', l.titulo);
    setText('kpiHas', `${has.toFixed(1)} ha`);
    setText('kpiCostoHa', `$${l.costoHa.toLocaleString()}`);
    setText('kpiRoi', `${Math.round(roi*100)}%`);
    if (mejorVentana) setText('kpiVentana', `${fmtDate(mejorVentana.ini)} – ${fmtDate(mejorVentana.fin)}`);
    selectListing(l.id, true);
    renderRanking(visibleListings);

    if (document.getElementById('toggleRoutes').checked) {
      await drawRouteForVisibleListings(visibleListings);
    } else {
      clearRoutes();
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('presupuesto').value = 5000;
    document.getElementById('recoGrid').hidden = true;
    document.getElementById('recoResumen').hidden = false;
    fitMapToData();
    document.getElementById('toggleRoutes').checked = false;
    clearRoutes();
  });

  document.getElementById('objetivo').addEventListener('change', () => {});

  document.getElementById('toggleRoutes').addEventListener('change', async (e) => {
    const presupuesto = parseFloat(document.getElementById('presupuesto').value || '0');
    const objetivo = getObjetivo();
    lastParams = { presupuesto, objetivo };
    if (e.target.checked) {
      await drawRouteForVisibleListings();
    } else {
      clearRoutes();
    }
  });

  document.getElementById('presupuesto').addEventListener('input', async () => {
    applyListingFilter();
    if (document.getElementById('toggleRoutes').checked) {
      lastParams.presupuesto = parseFloat(document.getElementById('presupuesto').value || '0');
      await drawSuggestedRoutes(lastParams.presupuesto, getObjetivo());
    }
  });
  document.getElementById('objetivo').addEventListener('change', async () => {
    applyListingFilter();
    if (document.getElementById('toggleRoutes').checked) {
      lastParams.objetivo = getObjetivo();
      await drawSuggestedRoutes(lastParams.presupuesto, lastParams.objetivo);
    }
  });
}

function highlightZona(id){
  Object.entries(zonaLayers).forEach(([k, poly]) => {
    poly.setOptions({
      strokeWeight: k === id ? 3 : 1.4,
      strokeOpacity: k === id ? 1 : 0.9,
      zIndex: k === id ? 3 : 2
    });
  });
  focusZona(id);
}

function setText(id, val){ const el = document.getElementById(id); if (el) el.textContent = val; }
function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day:'2-digit', month:'short' });
}

// Filtrar y dibujar listados según presupuesto
function applyListingFilter(){
  if (!LISTINGS.length) return;
  const budget = budgetUsd();
  visibleListings = filterListingsByBudget(budget);
  if (!visibleListings.find(l => l.id === selectedListingId)) {
    selectedListingId = visibleListings[0]?.id || null;
  }
  drawListingPolygons(visibleListings);
  drawListingMarkers(visibleListings);
  renderListingPills(visibleListings);
  renderMetricsPanel(visibleListings.find(l => l.id === selectedListingId) || visibleListings[0]);
  renderCharts();
  renderRankingPlaceholder();
  const alert = document.getElementById('budgetAlert');
  if (alert) alert.hidden = visibleListings.length > 0;
  const routesToggle = document.getElementById('toggleRoutes');
  const routesOn = routesToggle?.checked;
  if (routesOn && visibleListings.length >= 2) {
    drawRouteForVisibleListings(visibleListings);
  } else {
    clearRoutes();
  }
  if (selectedListingId) {
    selectListing(selectedListingId, false);
  } else {
    clearListingCard();
  }
}

// --- Bellman-Ford helpers (ruta óptima en grafo de zonas) ---
async function fetchBellmanFord(startId){
  if (!startId) return null;
  const url = `${API_BASE}/algorithms/bellman-ford?start=${encodeURIComponent(startId)}`;
  try {
    return await fetchJSON(url); // pide distancias y predecesores al backend
  } catch (err) {
    console.warn('Fallo al pedir Bellman-Ford, usando heurística.', err);
    return null;
  }
}

// Reconstruye un orden de visita a partir del árbol de predecesores de Bellman-Ford.
// Incluye cada nodo una sola vez, siguiendo los caminos más baratos desde el origen.
function buildBellmanRoute(list, bellman){
  if (!bellman?.distance || !bellman?.prev) return null;
  const byId = Object.fromEntries(list.map(l => [l.id, l])); // lookup rápido por id
  const startId = bellman.source || list[0]?.id; // usa origen devuelto o primer nodo
  if (!startId || !byId[startId]) return null;

  const ids = list
    .map(l => l.id)
    .filter(id => Number.isFinite(bellman.distance[id])); // descarta no alcanzables
  ids.sort((a,b) => bellman.distance[a] - bellman.distance[b]); // ordena por menor costo

  const routeIds = [];
  const seen = new Set();
  for (const target of ids){ // para cada objetivo alcanzable
    const path = [];
    let cur = target;
    let guard = 0;
    while (cur && guard < ids.length + 5){ // reconstruye camino hasta el origen
      path.push(cur);
      if (cur === startId) break;
      cur = bellman.prev[cur];
      guard++;
    }
    if (path[path.length - 1] !== startId) continue; // si no llega al origen, salta
    path.reverse(); // origen -> destino
    path.forEach(id => {
      if (!seen.has(id) && byId[id]) { // evita duplicados y nodos desconocidos
        routeIds.push(id);
        seen.add(id);
      }
    });
  }
  return routeIds.map(id => byId[id]);
}

// Heurística greedy (vecino más cercano) como fallback si falla Bellman-Ford.
function buildGreedyRoute(list){
  if (!list?.length) return [];
  const route = [list[0]];
  const remain = list.slice(1);
  while (remain.length){
    const last = route[route.length-1];
    let bestIdx = 0; let bestD = Infinity;
    for (let i=0;i<remain.length;i++){
      const d = haversine(last, remain[i]);
      if (d < bestD){ bestD = d; bestIdx = i; }
    }
    route.push(remain.splice(bestIdx,1)[0]);
  }
  return route;
}

// --- Rutas visibles (Bellman-Ford preferido, greedy como respaldo) ---
async function drawRouteForVisibleListings(list = visibleListings){
  clearRoutes(); // limpia cualquier ruta previa antes de dibujar
  const requestId = ++routeRequestToken; // token para invalidar respuestas viejas si el usuario cambia filtros
  if (!list || list.length < 2) return; // necesita al menos dos puntos para trazar
  const ordered = [...list].sort((a,b) => a.priceUsd - b.priceUsd); // arranca desde el más barato para consistencia

  const bellman = await fetchBellmanFord(ordered[0]?.id); // pide ruta óptima en el grafo de suelo
  const bellmanRoute = buildBellmanRoute(ordered, bellman); // reconstruye orden si hay datos válidos
  const route = (bellmanRoute?.length >= 2) ? bellmanRoute : buildGreedyRoute(ordered); // usa BF o fallback greedy

  let routesBounds = new google.maps.LatLngBounds(); // acumulador para encuadrar todo
  for (let i=0;i<route.length-1;i++){ // recorre los pares consecutivos de la ruta
    const a = route[i]; // origen
    const b = route[i+1]; // destino
    const { path, distanceKm } = await fetchGoogleRoute(a, b); // pide geometría real a Google Directions (fallback: línea recta)
    if (requestId !== routeRequestToken) return; // aborta si hubo nuevo request
    const nameA = a.titulo || a.nombre || a.id; // etiqueta amigable origen
    const nameB = b.titulo || b.nombre || b.id; // etiqueta amigable destino
    const lineLayer = new google.maps.Polyline({ // dibuja la polyline de la ruta
      path,
      strokeColor: '#3ee08f',
      strokeOpacity: 0.95,
      strokeWeight: 4,
      map,
      zIndex: 50
    });
    const mid = path[Math.floor(path.length/2)]; // punto medio para tooltip
    const label = `${nameA} → ${nameB} · ${distanceKm.toFixed(1)} km`; // texto con distancia estimada
    lineLayer.addListener('mouseover', () => { // tooltip al pasar el mouse
      routeInfoWindow.setContent(label);
      routeInfoWindow.setPosition(mid);
      routeInfoWindow.open(map);
    });
    lineLayer.addListener('mouseout', () => routeInfoWindow.close()); // cierra tooltip al salir
    routeLayerGroup.push(lineLayer); // guarda la capa para limpiar luego
    path.forEach(pt => routesBounds.extend(pt)); // amplía bounds con cada punto de la ruta
  }

  route.forEach((l, idx) => { // marca cada parada numerada
    if (requestId !== routeRequestToken) return; // aborta si hubo un request nuevo
    const marker = new google.maps.Marker({
      position: { lat: l.lat, lng: l.lng },
      map,
      label: { text: String(idx+1), color: '#062e1b', fontWeight:'700' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#3ee08f',
        fillOpacity: 0.95,
        strokeColor: '#0a1e14',
        strokeWeight: 2,
        scale: 10
      },
      zIndex: 55,
      title: `${idx+1}. ${l.titulo}`
    });
    routeLayerGroup.push(marker); // guarda para limpieza
    routesBounds.extend(marker.getPosition()); // incorpora el marcador al encuadre
  });

  map.fitBounds(routesBounds, { top: 40, bottom: 40, left: 40, right: 40 }); // ajusta la vista a toda la ruta
}

// ------- Rutas sugeridas entre zonas top-N -------
function computeTopZones(presupuesto, objetivo, k = 3){
  const evals = ZONAS.map(z => {
    const apt = aptitudZona(z, objetivo);
    const ingresoPorHa = z.rendimiento * 800;
    const margenPorHa = ingresoPorHa - z.costoHa * 0.6;
    const roi = clamp((margenPorHa / Math.max(1,z.costoHa)), -0.5, 1.5);
    const score = apt * (1 - z.riesgo*0.6) * (1 + roi*0.4);
    const centro = centroid(z.pol);
    return { z, score, centro };
  }).sort((a,b) => b.score - a.score);
  return evals.slice(0, Math.min(k, evals.length));
}

// --- Rutas sugeridas (Top zonas + Bellman-Ford, fallback vecino más cercano) ---
// Toma las 3 zonas mejor evaluadas, arma el orden preferentemente con Bellman-Ford
// y dibuja el recorrido con geometría de Google Directions.
async function drawSuggestedRoutes(presupuesto, objetivo){
  const requestId = ++routeRequestToken; // token para invalidar si hay otro request
  clearRoutes(); // limpia capas previas
  const top = computeTopZones(presupuesto, objetivo, 3); // top-K zonas según aptitud/ROI
  if (top.length < 2 || requestId !== routeRequestToken) return; // requiere al menos dos nodos

  // Prepara nodos con lat/lng en el centroide del polígono para Directions
  const candidates = top.map(t => ({
    ...t.z,
    lat: t.centro.lat,
    lng: t.centro.lng,
    centro: t.centro,
    titulo: t.z.titulo || t.z.nombre || t.z.id
  }));

  const bellman = await fetchBellmanFord(candidates[0]?.id); // pide rutas mínimas desde la mejor zona
  const bellmanRoute = buildBellmanRoute(candidates, bellman); // ruta ordenada por costo en el grafo
  const order = (bellmanRoute?.length >= 2) ? bellmanRoute : buildGreedyRoute(candidates); // usa Bellman-Ford o fallback

  let routesBounds = null; // bounds opcional para ajustar la vista
  for (let i=0;i<order.length-1;i++){ // dibuja cada tramo consecutivo
    const a = order[i]; // origen
    const b = order[i+1]; // destino
    const { path, distanceKm } = await fetchGoogleRoute(a, b); // pide ruta a Directions (o línea directa)
    if (requestId !== routeRequestToken) return; // aborta si hay un request más nuevo
    const lineLayer = new google.maps.Polyline({ // polyline del tramo
      path,
      strokeColor: '#39e08c',
      strokeOpacity: 0.95,
      strokeWeight: 4,
      map,
      zIndex: 4
    });
    const label = `Ruta ${i+1} → ${i+2} · ${distanceKm.toFixed(2)} km`; // texto con distancia
    lineLayer.addListener('mouseover', () => { // tooltip en hover
      routeInfoWindow.setContent(label);
      routeInfoWindow.setPosition(path[Math.floor(path.length/2)]);
      routeInfoWindow.open(map);
    });
    lineLayer.addListener('mouseout', () => routeInfoWindow.close()); // cierra tooltip al salir
    routeLayerGroup.push(lineLayer); // guarda para poder limpiarlo
    routesBounds = routesBounds || new google.maps.LatLngBounds(); // inicializa bounds si no existe
    path.forEach(pt => routesBounds.extend(pt)); // amplía bounds con los puntos de la ruta
  }
  for (let idx=0; idx<order.length; idx++){ // pone marcadores numerados en cada zona
    if (requestId !== routeRequestToken) return; // aborta si hay request nuevo
    const o = order[idx];
    const marker = new google.maps.Marker({
      position: { lat: o.lat, lng: o.lng },
      map,
      label: {
        text: String(idx + 1),
        color: '#062e1b',
        fontWeight: '700'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#3ee08f',
        fillOpacity: 0.95,
        strokeColor: '#0a1e14',
        strokeWeight: 2,
        scale: 10
      },
      zIndex: 5,
      title: `${idx+1}. ${o.titulo || o.nombre || o.id}`
    });
    routeLayerGroup.push(marker); // guarda para limpiar
    if (routesBounds) routesBounds.extend(marker.getPosition()); // expande bounds con el marcador
  }

  if (requestId !== routeRequestToken) return; // aborta si se disparó otro request
  if (routesBounds) {
    map.fitBounds(routesBounds, { top: 40, bottom: 40, left: 40, right: 40 }); // ajusta vista a la ruta
  } else { // fallback si no hubo geometría (no debería)
    const fallbackBounds = new google.maps.LatLngBounds(); // bounds alterno
    order.forEach(o => fallbackBounds.extend({ lat: o.centro.lat, lng: o.centro.lng })); // usa centroides
    map.fitBounds(fallbackBounds, { top: 40, bottom: 40, left: 40, right: 40 }); // ajusta con centroides
  }
}

async function fetchGoogleRoute(a, b){
  if (!directionsService) {
    const fallback = [ { lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng } ];
    return { path: fallback, distanceKm: haversine(a, b) };
  }

  const origin = { lat: a.lat, lng: a.lng };
  const destination = { lat: b.lat, lng: b.lng };
  return new Promise((resolve) => {
    directionsService.route({
      origin,
      destination,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result.routes?.[0]) {
        const route = result.routes[0];
        const overview = route.overview_path.map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
        const leg = route.legs?.[0];
        const distanceKm = leg?.distance?.value ? leg.distance.value / 1000 : haversine(a, b);
        resolve({ path: overview, distanceKm });
      } else {
        console.warn('Fallo al pedir ruta Directions, usando línea directa.', status, result);
        const fallback = [ origin, destination ];
        resolve({ path: fallback, distanceKm: haversine(a, b) });
      }
    });
  });
}

function clearRoutes(){
  routeLayerGroup.forEach(layer => layer.setMap(null));
  routeLayerGroup = [];
  routeInfoWindow?.close();
}

function centroid(poly){
  let lat=0, lng=0; const n = poly.length;
  poly.forEach(([la, ln]) => { lat += la; lng += ln; });
  return { lat: lat/n, lng: lng/n };
}

function haversine(a, b){
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLng = deg2rad(b.lng - a.lng);
  const la1 = deg2rad(a.lat), la2 = deg2rad(b.lat);
  const sinDLat = Math.sin(dLat/2), sinDLng = Math.sin(dLng/2);
  const x = sinDLat*sinDLat + Math.cos(la1)*Math.cos(la2)*sinDLng*sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  return R * c;
}
function deg2rad(d){ return d * Math.PI / 180; }

function fitMapToData(){
  if (!map) return;
  const bounds = new google.maps.LatLngBounds();
  HUANCAYO_OUTLINE.forEach(([lat,lng]) => bounds.extend({ lat, lng }));
  (visibleListings.length ? visibleListings : LISTINGS).forEach(l => bounds.extend({ lat: l.lat, lng: l.lng }));
  if (bounds.isEmpty()) {
    map.setCenter({ lat: HUANCAYO_CENTER.lat, lng: HUANCAYO_CENTER.lng });
    map.setZoom(12);
    return;
  }
  map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
}

// Boot (llamado por callback de Google Maps)
window.initAgroFuturo = () => {
  initMap();
  initUI();
  bootstrapData();
};
