# Engine 16 — GeoMap (site maps with raster tile basemaps, d3-geo + embedded GeoJSON)

**Routing row:** see SKILL.md §1 row 16 — `templates/geomap.html` · §5l · `engines/geomap.md`

**Scope:** local/regional maps that need **real-world context** — sampling-site maps (satellite or street tiles), coverage polygons (mangrove, protected areas), study-area figures. Two basemap modes: (a) **raster tiles** (`basemap.raster` — OSM/Esri/Carto imagery fetched at build time via `bin/tile_basemap.py` and embedded as a data URI; the recommended "real map" look, offline after build), and (b) **vector GeoJSON** (`basemap.land`) for stylized figures. Overlays (coverage polygons, lines, labeled site markers, scale bar, north arrow, legend) render as vector on top; the whole figure is one self-contained HTML with the shared print-export module.

**Not for:** world-scale reference maps where the built-in PlotlyGeo basemap suffices (engines/plotlygeo.md — no GeoJSON or tiles needed), and interactive slippy maps (use Leaflet/folium — chartz figures are static and self-contained).

**Basemap data sourcing (the real work of a map figure):**

- **Raster tiles (recommended)**: `bin/tile_basemap.py --bbox ... --aspect W/H --topology satellite|street|...` — same 9 free providers as the geocoding skill (`skills/geocoding`): street, humanitarian, satellite (Esri World Imagery), topo, esri-topo, esri-streets, esri-gray, carto-light, carto-dark. Stitches tiles in web-mercator space, expands the bbox to the frame aspect, embeds a data-URI PNG. Attribution is auto-included and required by tile terms.
- **Vector coastline**: `bin/gis_prep.py` — OpenStreetMap Overpass API (POST + User-Agent; `natural=coastline` ways assembled into rings with border closure and land/sea orientation check; place=island relations give named polygons). Natural Earth (`nvkelso/natural-earth-vector`) is fine for context but far too coarse for archipelagos (44 coastline vertices in a 1° Klang bbox; mangrove islands absent).
- **Project GIS outputs**: GeoJSON exports from QGIS, `geopandas`, or `sf` — preferred when the study owns coverage polygons. Clip + simplify with `gis_prep.py clip` to keep the HTML small.

**Print export**: identical module to the other template-native engines — `SPEC.export: { width_mm, dpi, font_family }`, SVG in mm units, PNG deterministic (`px = mm / 25.4 · dpi`). Note: with a raster basemap, Download SVG embeds the raster as an image — vector traces for the tiles themselves are impossible; the overlays remain true vector. See SKILL.md §6b.

## Spec (fills `/*__SPEC__*/` as `const SPEC = {...}`)

```js
{
  title: "eDNA sampling sites, Klang Islands",
  subtitle: "Zones A–D · basemap: Esri World Imagery tiles (embedded)",   // optional grey line
  width: 900, height: 720,             // nominal viewBox
  projection: "mercator",              // mercator | equirectangular
  bbox: { lon_min: 100.95, lat_min: 2.55, lon_max: 101.85, lat_max: 3.45 },
                                       // ignored when basemap.raster is present
                                       // (the projection fits the RASTER bbox so overlays align)
  basemap: {
    raster: {                          // OPTIONAL tile basemap (recommended for the "real map" look)
      "data": "data:image/png;base64,...",       // from bin/tile_basemap.py
      "bbox": {"lon_min": ..., "lat_min": ..., "lon_max": ..., "lat_max": ...},
      "attribution": "© Esri World Imagery"    // REQUIRED by tile usage policies
    },
    land: <FeatureCollection>,         // optional vector land (usually omitted with a raster);
                                       // embedded GeoJSON (Polygon/MultiPolygon)
    land_fill: "#e8e4d8", land_stroke: "#8a8a7a",   // land_stroke_width optional
    ocean_color: "#cfe3f0",
    graticule: false                   // true = lat/lon grid (vector mode only)
  },
  layers: [                            // drawn in order: polygons/lines under points
    { type: "polygons", label: "Mangrove cover", features: <FC>,
      fill: "#2ca25f", fill_opacity: 0.45, stroke: "#00441b", stroke_width: 1 },
    { type: "lines", label: "Klang River", features: <FC|LineString>,
      stroke: "#2166ac", width: 2.5, dash: "6 3" },
    { type: "points", label: "eDNA sampling site",        // label → legend row
      items: [ { lon: 101.366, lat: 2.880, label: "Zone A · Pulau Carey",
                 color: "#4E79A7", size: 8, label_side: "right" } ] }
                                       // label_side: right (default) | left | top | bottom
  ],
  scale_bar: true,                     // or { length_km: 20 }; auto nice length, bottom-left
  north_arrow: true,                   // top-right; false to omit (white-haloed for rasters)
  legend: true,                        // bottom-right box, one row per labeled layer
  export: { width_mm: 183, dpi: 300 }
}
```

## Pitfalls

- **d3 winding convention (S12 — inverted/complement fills)**: d3-geo treats polygons as SPHERICAL and picks the interior by winding — exterior rings must be **clockwise** (holes counterclockwise), the OPPOSITE of the GeoJSON RFC. A counterclockwise ring fills its planar complement (the rest of the world → whole map turns land-colored). The template normalizes winding (shoelace test per ring) before rendering, so valid GeoJSON of either winding renders correctly — but if you render GeoJSON with raw d3 elsewhere, reverse CCW exterior rings yourself.
- **Never fill multiple land features as ONE path with `fill-rule: evenodd`**: overlapping features (e.g. an OSM island inside a coarser Natural Earth mainland polygon) XOR to water. The template renders one path per feature; keep it that way.
- **Derive marker coordinates from the geometry, never from memory**: compute the centroid of the site's polygon (the OSM relation geometry you fetched) — hand-recalled coordinates are routinely kilometres off (a Pulau Ketam marker was plotted 10 km north of the island).
- **Raster/vector alignment**: the raster is a web-mercator crop — the template fits the projection to `raster.bbox`, so any lat/lon overlay lands exactly on the imagery. If you also pass a vector `bbox` it is IGNORED while a raster is present (by design).
- **Tile etiquette**: attribution line auto-included and required; keep zoom ≤ 18 and the tile count modest (the helper hard-caps at 400 tiles); fetch at build time only.
- **Natural Earth ≠ local detail**: NE 10m has ~44 coastline vertices in a 1° Klang bbox and omits mangrove islands entirely. For island-scale vector work pull OSM (Overpass) or project-owned polygons; if merging NE mainland + OSM islands, drop the coarse NE island pieces (they double-cover the OSM ones).
- **Ring assembly traps**: (a) already-closed fragments must be routed to rings before chaining or they re-match themselves forever; (b) the two "prepend" branches of greedy chaining MUST pop the consumed fragment or the chain flips between fragments infinitely; (c) chains that leave the query bbox must be closed along the bbox BORDER (not a straight chord — it cuts across land and inverts the fill); verify orientation with a known-land point (ray cast) and reverse if needed — and double-check your own test points (a strait is west of a west-facing coast).
- **Degenerate rings**: tiny islets collapse to <4 points after simplification and crash d3 (sub-4-point polygon rings) — drop them.
- **Overpass etiquette**: POST (GET gives 406 without a User-Agent), set a User-Agent, keep bbox queries small; relations need ring assembly (`role: "outer"` fragments chained by matching endpoints) — a plain `out geom` relation has fragmented coastline ways.
- **HTML size**: every geometry AND raster tile is embedded. Clip + simplify vectors; pick a modest zoom for tiles (a 900×720 frame at zoom 11 ≈ 500–800 KB). Site-map figures with satellite imagery land at ~1 MB — acceptable, but don't stack multiple rasters.
- **Ring closure**: unclosed rings silently break (the template skips malformed rings); holes work via `fill-rule: evenodd` when stored as sibling rings of the polygon.
- **Meridian-crossing data** (lon > 180 vs < −180 mixed): normalize to one convention before embedding.

## Build helpers

```bash
# A. raster tile basemap (recommended; requires Pillow at build time only)
python3 bin/tile_basemap.py --bbox 100.95,2.55,101.85,3.45 --aspect 900/720 \
    --topology satellite --out basemap.json        # paste as SPEC.basemap.raster

# B. vector coastline from OSM (python3 stdlib only)
python3 bin/gis_prep.py overpass "2.45,100.85,3.55,101.98" land.json \
    --tol 0.0002 --land-pt 101.7,3.0 --sea-pt 101.05,3.1
# retry from a cached Overpass response after 429/504 (no second fetch)
python3 bin/gis_prep.py overpass "..." land.json --cache overpass_response.json ...
# clip/simplify an existing GeoJSON (project GIS export) to the map bbox
python3 bin/gis_prep.py clip input.geojson land.json "100.95,2.55,101.85,3.45" --tol 0.0002
```

`--land-pt`/`--sea-pt` in `gis_prep.py` are a known-land and a known-sea lon/lat used to verify ring orientation — pick them from the map region (a mistake here silently inverts the map; the sea point must be in OPEN WATER, the land point well inland).

## Worked examples

- `geomap-sampling-sites.html` — Klang Islands eDNA sites on an **Esri World Imagery tile basemap** (build-time fetch, embedded), markers at true OSM island centroids, scale bar, north arrow, legend; ~1 MB self-contained HTML.
- `geomap-coverage.html` — polygon/line/point layers over an **OSM street-tile raster basemap** (demo mangrove-cover polygons + schematic Klang River; the "project GIS export" input path).

## Reference ecosystem (heavy GIS stays here, chartz renders)

See `references/gis.md` — geopandas/shapely/pyproj/rasterio/cartopy (Python), sf/terra/tmap/ggspatial (R) for spatial analysis and projection work; the **geocoding skill** (`skills/geocoding`) for place-name → coordinate resolution and standalone tile PNGs; chartz GeoMap/PlotlyGeo sit at the last mile (GeoJSON/coordinates + tile basemaps → one self-contained print-sized HTML).