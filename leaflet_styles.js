// Leaflet styling exported from term_project.qgz (QGIS).
// QGIS sizes are in points; Leaflet uses pixels (1 pt = 4/3 px).
// Zoom thresholds are the QGIS scale limits converted for San Francisco (~37.7°N).

const pt = (v) => Math.round(v * 4 / 3);

// ---------- Basemap (QGIS layer "Stamen watercolor") ----------
const BASEMAP = {
  url: "https://watercolormaps.collection.cooperhewitt.org/tile/watercolor/{z}/{x}/{y}.jpg",
  options: {
    minZoom: 0,
    maxZoom: 18,
    opacity: 0.5, // QGIS layer opacity 50%
    attribution:
      'Map tiles by <a href="http://stamen.com">Stamen Design</a> (hosted by Cooper Hewitt), ' +
      'data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// ---------- Boundary (single symbol, no fill, thin tan outline) ----------
const BOUNDARY_STYLE = {
  fill: false,
  color: "rgb(243,210,142)",
  weight: 1,            // 0.26 mm
  opacity: 1,
  lineJoin: "bevel",
};

// ---------- Amenities (categorized on amenity_type) ----------
// QGIS: point displacement renderer, visible only at 1:7500 or closer => zoom 16+.
const AMENITIES = {
  field: "amenity_type",
  minZoom: 16,
  onByDefault: ["little_free_libraries"],
  size: pt(14), // 19 px
  icons: {
    bathrooms: "icons/amenities/bathroom.svg",
    bike_repair: "icons/amenities/tool.svg",
    drinking_water: "icons/amenities/water.svg",
    give_boxes: "icons/amenities/gift.svg",
    little_free_libraries: "icons/amenities/book.svg",
    showers: "icons/amenities/shower.svg",
  },
};

// ---------- Falling fruit (categorized on fruit_type, clustered) ----------
// QGIS: point cluster renderer, 40 pt tolerance. Plum is offered in the legend (QGIS: 50% opacity).
// Only the types in onByDefault start checked. NULL values are never shown.
const FALLING_FRUIT = {
  field: "fruit_type",
  clusterRadius: pt(40), // 53 px
  icons: {
    apple: { url: "icons/falling_fruit/apple.svg", size: pt(16) },
    citrus: { url: "icons/falling_fruit/citrus.svg", size: pt(16) },
    fig: { url: "icons/falling_fruit/fig.svg", size: pt(16) },
    loquat: { url: "icons/falling_fruit/loquat.svg", size: pt(16) },
    mulberry: { url: "icons/falling_fruit/mulberry.svg", size: pt(16) },
    nut: { url: "icons/falling_fruit/nut.svg", size: pt(16) },
    other: { url: "icons/falling_fruit/fruit.svg", size: pt(16) },
    peach: { url: "icons/falling_fruit/peach.svg", size: pt(14) },
    persimmon: { url: "icons/falling_fruit/persimmon.svg", size: pt(16) },
    plum: { url: "icons/falling_fruit/plum.svg", size: pt(14), opacity: 0.5 }, // QGIS: 14 pt, 50% opacity
  },
  onByDefault: ["persimmon"],
  cluster: {
    url: "icons/falling_fruit/basket.svg",
    size: pt(20), // 27 px
  },
};

// ---------- Sea foraging (categorized on seafood_type, clustered, labeled) ----------
const SEA_FORAGING = {
  field: "seafood_type",
  clusterRadius: pt(40),
  size: pt(18), // 24 px
  icons: {
    clams: "icons/sea_foraging/clam.svg",
    crabs: "icons/sea_foraging/crab.svg",
    mussels: "icons/sea_foraging/mussel.svg",
    no_take: "icons/sea_foraging/no_take.svg",
    seaweed: "icons/sea_foraging/seaweed.svg",
  },
  cluster: {
    url: "icons/sea_foraging/fishing.svg",
    size: pt(20), // 27 px
  },
  // QGIS label: "name" \n "season" \n "limits", Open Sans 10 pt, visible at 1:15000 or closer => zoom 15+
  labelMinZoom: 15,
  onByDefault: ["crabs"],
};

// ---------- Helpers ----------
function svgIcon(url, size) {
  return L.icon({
    iconUrl: url,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Names shown in the legend for each type value (anything not listed: underscores -> spaces, first letter capitalized).
const TYPE_LABELS = {
  no_take: "No-take zones",
  little_free_libraries: "Little free libraries",
  give_boxes: "Give boxes",
  bike_repair: "Bike repair",
  drinking_water: "Drinking water",
  other: "Other fruit",
};
const typeLabel = (v) => TYPE_LABELS[v] || (v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " "));

// Build one marker per feature, grouped by its type value, in the order the types are listed in cfg.icons.
// Features whose type has no icon are skipped (like render=false in QGIS).
function markersByType(data, cfg, iconFor, decorate) {
  const byType = {};
  Object.keys(cfg.icons).forEach((v) => (byType[v] = []));
  data.features.forEach((f) => {
    const v = f.properties[cfg.field];
    const icon = byType[v] && iconFor(v);
    if (!icon) return;
    const [lng, lat] = f.geometry.coordinates;
    const m = L.marker([lat, lng], { icon, opacity: (cfg.icons[v] && cfg.icons[v].opacity) || 1 });
    m.feature = f;
    if (decorate) decorate(m, f.properties);
    byType[v].push(m);
  });
  return byType;
}

// Wraps a container layer plus its per-type markers so the legend can switch each type on and off.
// Only the types listed in onByDefault start checked (all types if the list is missing).
function toggleableLayer(container, byType, iconUrl, add, remove, onByDefault) {
  const on = new Set(Object.keys(byType).filter((v) => !onByDefault || onByDefault.includes(v)));
  on.forEach((v) => add(byType[v]));
  return {
    layer: container,
    types: Object.keys(byType).map((v) => ({
      value: v, label: typeLabel(v), icon: iconUrl(v), count: byType[v].length, on: on.has(v),
    })),
    setType(v, visible) {
      if (visible === on.has(v)) return;
      visible ? (on.add(v), add(byType[v])) : (on.delete(v), remove(byType[v]));
    },
  };
}

function clusterGroup(cfg, className) {
  return L.markerClusterGroup({
    maxClusterRadius: cfg.clusterRadius,
    showCoverageOnHover: false,
    iconCreateFunction: (c) => {
      const s = cfg.cluster.size;
      return L.divIcon({
        className,
        html: `<img src="${cfg.cluster.url}" width="${s}" height="${s}"><span>${c.getChildCount()}</span>`,
        iconSize: [s, s],
      });
    },
  });
}

function fallingFruitLayer(data) {
  const byType = markersByType(data, FALLING_FRUIT, (v) => svgIcon(FALLING_FRUIT.icons[v].url, FALLING_FRUIT.icons[v].size));
  const group = clusterGroup(FALLING_FRUIT, "cluster-fruit");
  return toggleableLayer(group, byType, (v) => FALLING_FRUIT.icons[v].url,
    (ms) => group.addLayers(ms), (ms) => group.removeLayers(ms), FALLING_FRUIT.onByDefault);
}

function seaForagingLayer(data, map) {
  const byType = markersByType(data, SEA_FORAGING, (v) => svgIcon(SEA_FORAGING.icons[v], SEA_FORAGING.size), (m, p) => {
    const text = [p.name, p.season, p.limits].filter(Boolean).join("<br>");
    m.bindTooltip(text, {
      permanent: true,
      direction: "right",
      offset: [SEA_FORAGING.size / 2, 0],
      className: "sea-label",
    });
  });
  const group = clusterGroup(SEA_FORAGING, "cluster-sea");

  // Show labels only at zoom 15+ (QGIS max scale 1:15000).
  const toggleLabels = () =>
    map.getContainer().classList.toggle("hide-sea-labels", map.getZoom() < SEA_FORAGING.labelMinZoom);
  map.on("zoomend", toggleLabels);
  toggleLabels();

  return toggleableLayer(group, byType, (v) => SEA_FORAGING.icons[v],
    (ms) => group.addLayers(ms), (ms) => group.removeLayers(ms), SEA_FORAGING.onByDefault);
}

function amenitiesLayer(data) {
  const byType = markersByType(data, AMENITIES, (v) => svgIcon(AMENITIES.icons[v], AMENITIES.size));
  const inner = L.layerGroup();
  return toggleableLayer(minZoomLayer(inner, AMENITIES.minZoom), byType, (v) => AMENITIES.icons[v],
    (ms) => ms.forEach((m) => inner.addLayer(m)), (ms) => ms.forEach((m) => inner.removeLayer(m)),
    AMENITIES.onByDefault);
}

// A layer that only draws at minZoom and closer (amenities: QGIS max scale 1:7500 => zoom 16+).
// The legend checkbox controls the returned group, so it keeps its on/off state at every zoom;
// the markers inside just wait until you zoom in far enough.
function minZoomLayer(layer, minZoom) {
  const group = L.layerGroup();
  let map = null;
  const update = () => {
    if (map.getZoom() >= minZoom) group.addLayer(layer);
    else group.removeLayer(layer);
  };
  group.on("add", (e) => { map = e.target._map; map.on("zoomend", update); update(); });
  group.on("remove", () => { if (map) map.off("zoomend", update); group.removeLayer(layer); map = null; });
  return group;
}

// Legend with a checkbox per layer and per type. sections: [{ title, hint, item }] where item comes
// from fallingFruitLayer / seaForagingLayer / amenitiesLayer.
function legendControl(map, sections) {
  const ctl = L.control({ position: "topright" });
  ctl.onAdd = () => {
    const div = L.DomUtil.create("div", "legend leaflet-bar");
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    // Each section (fruit, sea foraging, amenities) collapses on its own via the arrow.
    // All sections start open so every category is visible when the map loads.
    sections.forEach(({ title, hint, item }) => {
      const sec = L.DomUtil.create("div", "legend-section", div);
      const bar = L.DomUtil.create("div", "legend-bar", sec);
      const arrow = L.DomUtil.create("button", "legend-arrow", bar);
      arrow.type = "button";
      arrow.textContent = "▾";
      arrow.title = "Show or hide " + title.toLowerCase() + " types";
      const setOpen = (open) => {
        sec.classList.toggle("legend-collapsed", !open);
        arrow.setAttribute("aria-expanded", String(open));
      };
      setOpen(true);
      arrow.addEventListener("click", () => setOpen(sec.classList.contains("legend-collapsed")));
      const head = L.DomUtil.create("label", "legend-head", bar);
      const all = L.DomUtil.create("input", "", head);
      all.type = "checkbox";
      all.checked = map.hasLayer(item.layer);
      head.append(" " + title);
      if (hint) {
        const h = L.DomUtil.create("span", "layer-hint", head);
        h.textContent = " " + hint;
      }
      const list = L.DomUtil.create("div", "legend-types", sec);
      item.types.forEach((t) => {
        const row = L.DomUtil.create("label", "legend-type", list);
        const cb = L.DomUtil.create("input", "", row);
        cb.type = "checkbox";
        cb.checked = t.on;
        const img = L.DomUtil.create("img", "", row);
        img.src = t.icon;
        img.alt = "";
        row.append(t.label);
        cb.addEventListener("change", () => item.setType(t.value, cb.checked));
      });
      const sync = () => sec.classList.toggle("legend-off", !all.checked);
      all.addEventListener("change", () => {
        all.checked ? map.addLayer(item.layer) : map.removeLayer(item.layer);
        sync();
      });
      sync();
    });
    return div;
  };
  return ctl;
}
