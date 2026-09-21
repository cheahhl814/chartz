# Engine 15 — GeoMap (tile-basemap site maps + vector reference maps, d3-geo overlays)

**Routing row:** see SKILL.md §1 row 15 — `templates/geomap.html` · §5k · `engines/geomap.md`

**Scope — two map classes, one engine:**

1. **Local site maps on raster tile basemaps** — sampling-site maps on satellite or street imagery. The basemap is a **raster tile image** (OSM/Esri/Carto, fetched at build time via `bin/tile_basemap.py` and embedded as a data URI — the delivered HTML renders fully offline); study data renders as vector on top: coverage polygons, lines, labeled site markers, scale bar, north arrow, legend.
2. **Regional occurrence/reference maps in vector style** (~5–30° span, journal figures) — grey Natural Earth 50m land on pale sea with a **degree-formatted graticule axis** (`95°E`, `4°S`), occurrence points with **dual categorical encoding** (colour = e.g. species, shape = data source), a **grouped two-section legend**, and **floating italic place-name annotations**. GeoJSON for the land comes from the GIS stack (R `rnaturalearth::ne_countries(scale = 50, returnclass = "sf")` → GeoJSON; Python geopandas equivalent) — chartz receives finished, clipped GeoJSON and never sources or simplifies geometry itself.

The whole figure is one self-contained HTML with the shared print-export module.

**Not for:** world/continent-scale choropleths with numeric region values (use geopandas/tmap), projected CRS other than Mercator/Equirectangular, interactive slippy maps (use Leaflet/folium — chartz figures are static and self-contained). Place-name → coordinate resolution: use the **geocoding skill** (`skills/geocoding`), then hand the coordinates to this engine.

**Print export:** identical module to the other template-native engines — `SPEC.export: { width_mm, dpi, font_family }`, SVG in mm units, PNG deterministic (`px = mm / 25.4 · dpi`). With a raster basemap, Download SVG embeds the imagery as an image element (the tiles themselves cannot be vectorized); the overlays remain true vector. In the vector reference-map mode the whole figure exports as TRUE vector SVG. See SKILL.md §6b.

## Spec (fills `/*__SPEC__*/` as `const SPEC = {...}`)

```js
{
  title: "eDNA sampling sites, Klang Islands",
  subtitle: "Zones A–D · basemap: Esri World Imagery tiles (embedded)",   // optional grey line
  width: 900, height: 720,             // nominal viewBox
  projection: "mercator",
  basemap: {
    raster: {                          // REQUIRED for the tile look; build with bin/tile_basemap.py
      "data": "data:image/png;base64,...",
      "bbox": {"lon_min": ..., "lat_min": ..., "lon_max": ..., "lat_max": ...},
      "attribution": "© Esri World Imagery"    // REQUIRED by tile usage policies
    }
    // vector alternative — publication reference-map preset:
    // { "land": <FeatureCollection>, "land_fill": "#f0f0f0", "land_stroke": "#888888",
    //   "land_stroke_width": 0.4, "ocean_color": "#e6f0fa",
    //   "graticule": { "stroke": "#ffffff", "stroke_width": 0.6, "labels": true } }
    // graticule: true (white lines + degree labels) | object (step: [lon,lat] to override
    // auto tick spacing) | false. Degree labels (95°E, 4°S) render outside the frame.
  },
  layers: [                            // drawn in order: polygons/lines under points
    { type: "polygons", label: "Mangrove cover", features: <FeatureCollection>,
      fill: "#2ca25f", fill_opacity: 0.45, stroke: "#00441b", stroke_width: 1 },
    { type: "lines", label: "Klang River", features: <LineString>,
      stroke: "#2166ac", width: 2.5, dash: "6 3" },
    { type: "points", label: "eDNA sampling site",        // label → legend row
      items: [ { lon: 101.366, lat: 2.880, label: "Zone A · Pulau Carey",
                 color: "#4E79A7", size: 8, label_side: "right" } ] }
                                       // label_side: right (default) | left | top | bottom
  ],
  annotations: [                       // free-floating place-name labels (layer-independent)
    { lon: 101.0, lat: -1.6, text: "Sumatra", size: 10, color: "#666", italic: true }
                                       // multi-line: text: "Peninsular\\nMalaysia"; anchor: middle (default)
  ],
  shape_key: {                         // SECOND legend section for shape encoding (optional)
    title: "Data source",
    items: [ { shape: "circle", fill: "#333", label: "GBIF observation" },
             { shape: "diamond", fill: "#fff", stroke: "#333", size: 9, label: "This study" } ]
  },
  scale_bar: true,                     // or { length_km: 20 }; auto nice length, bottom-left; false to omit
  north_arrow: true,                   // top-right; false to omit (white-haloed for rasters)
  legend: true,                        // bottom-right box; grouped via layer.group / shape_key
  export: { width_mm: 183, dpi: 300 }
}
```

**Point shapes (second categorical encoding)** — every point item and legend glyph accepts
`shape: "circle" (default) | "diamond" | "square" | "triangle"`, plus `stroke` (default `#fff`)
and `stroke_width` (default 1.5). The publication pattern: colour = species/treatment (filled
circles), shape = data source (This study = larger open diamond: `color: "#ffffff",
stroke: <series colour>, stroke_width: 1.8, size: 10`) — legible in grayscale print. Open a
legend row per point item with `legend_rows: "items"` (items need labels); a plain layer label
renders one row per layer with the layer colour. Group rows under a bold header by setting
`group: "Species"` on the layers; `shape_key` adds its own titled section.

The projection always fits `raster.bbox` when a raster is present (any spec-level `bbox` is ignored by design) — that is what keeps lat/lon overlays pixel-aligned with the imagery: d3.geoMercator and web-mercator tiles are the same projection. Without a raster, set `bbox` explicitly (a regional frame) or the template fits all data.

## Build helper

```bash
python3 bin/tile_basemap.py --bbox 100.95,2.55,101.85,3.45 --aspect 900/720 \
    --topology satellite --out basemap.json        # paste as SPEC.basemap.raster
```

Providers (same free set as the geocoding skill's `map` subcommand): `street`, `humanitarian`, `satellite` (Esri World Imagery), `topo`, `esri-topo`, `esri-streets`, `esri-gray`, `carto-light`, `carto-dark`. Auto-zoom targets ~900 px of frame width; a 400-tile hard cap prevents runaway fetches. Tiles are fetched at BUILD time only — the attribution line (auto-included, required by tile terms) is drawn bottom-right.

## Pitfalls

- **Derive marker coordinates from the geometry, never from memory** (e.g. centroid of the site's polygon from the geocoding/OSM data): hand-recalled lat/lon are routinely kilometres off — a Pulau Ketam marker was once plotted 10 km north of its island.
- **Raster/vector alignment**: both are web-mercator; alignment holds only when the projection fits the raster bbox (the template does this automatically). Don't override with a different projection when a raster is present.
- **Tile etiquette**: attribution required; zoom ≤ 18; modest tile counts (helper caps at 400); build-time fetch only.
- **HTML size**: the imagery is embedded (~0.5–1 MB for a regional frame at zoom 11) — acceptable for a site map, don't stack multiple rasters.
- **d3 winding convention (S12)**: if you also pass vector `land` polygons, note d3-geo treats them as SPHERICAL — exterior rings must be clockwise (opposite of the GeoJSON RFC) or the fill inverts to the planar complement. The template normalizes winding (shoelace per ring), but raw-d3 renders elsewhere need it done by hand.
- **Meridian-crossing data** (lon > 180 vs < −180 mixed): normalize to one convention before embedding.
- **Scale-appropriateness of vector vs raster**: NE 50m vector is right at ~5–30° regional span and WRONG at archipelago scale (coastline detail disappears — use the tile raster there). Don't resurrect in-skill geometry sourcing to work around it — get finer GeoJSON from the GIS stack.
- **`<i>` tags are NOT parsed in labels or annotations** — text is inserted as `textContent`. For italic binomials use the item/layer `italic: true` flag (or `annotations[].italic`, on by default).
- **Legend overflow**: a grouped legend (one row per species + shape key) grows tall; place it clear of dense point clusters or thin the row set (legend per layer instead of per item).
- **Graticule tick spacing** is auto-niced from the bbox span (~5 ticks/axis); override with `graticule: {step: [5, 5]}` when a journal figure demands fixed intervals.

## Worked examples

- `geomap-sampling-sites.html` — Klang Islands eDNA sites on an **Esri World Imagery tile basemap**, markers at island centroids (coordinates verified against the OSM island geometry), scale bar, north arrow, legend; ~1 MB self-contained HTML. (Local site-map class.)
- `geomap-occurrence.html` — *Betta waseri* complex occurrence map: 33 GBIF records (filled circles, colour = species) + 4 study specimens (open diamonds) over clipped **Natural Earth 50m vector land**, degree-labelled graticule, italic place-name annotations, grouped legend (Species / Data source); 65 KB self-contained HTML, true-vector SVG export. (Regional reference-map class; land GeoJSON sourced once from R `rnaturalearth` and clipped to the frame.)

## Reference ecosystem (heavy GIS stays here, chartz renders)

For spatial analysis (reprojection, spatial joins, raster math), use geopandas/shapely/pyproj/rasterio/cartopy (Python) or sf/terra/tmap (R) and hand this engine the finished coordinates/GeoJSON. For place-name resolution and standalone tile PNGs, see the **geocoding skill** (`skills/geocoding`).