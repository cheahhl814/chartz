# Engine 16 — GeoMap (site maps with real coastline detail, d3-geo + embedded GeoJSON)

**Routing row:** see SKILL.md §1 row 16 — `templates/geomap.html` · §5l · `engines/geomap.md`

**Scope:** local/regional maps where coastline or boundary **detail matters** — sampling-site maps with small islands, coverage polygons (mangrove, protected areas), study-area context figures. d3-geo (pinned `d3-array@3.2.4` + `d3-geo@3.1.1`, CDN) projects **GeoJSON embedded in the SPEC**; the whole figure is one self-contained offline HTML with the shared print-export module (Download SVG mm-sized / Download PNG deterministic).

**Not for:** satellite/tile basemaps (raster imagery — QGIS, cartopy+contextily, or web-map screenshots), world-scale reference maps where a built-in basemap is enough (use PlotlyGeo, engines/plotlygeo.md — it carries its own topology and needs no GeoJSON), and point-only figures with no geographic base (Plotly scatter is fine).

**Basemap data sourcing (the real work of a map figure):** the SPEC carries the geometry, so the agent must assemble it at build time. Verified sources:

- **Natural Earth** (`nvkelso/natural-earth-vector` GitHub raw `geojson/ne_10m_*.geojson`): global physical layers; "10m" ≈ 1:10 million, still too coarse for archipelagos (the Klang bbox has 44 coastline vertices — mangrove islands absent). Good for context and country outlines.
- **OpenStreetMap via Overpass API** (`overpass-api.de/api/interpreter`, POST with a User-Agent header; plain GET returns 406): island/place relations with `out geom;` give full detail (Pulau Ketam at 889 nodes). Assemble `outer` member fragments into rings by chaining matching endpoints, simplify (~0.0002°), clip to bbox (Sutherland–Hodgman for polygons) to keep the HTML small.
- **Project GIS outputs**: GeoJSON/Shapefile exports from QGIS, `geopandas`, or `sf` — preferred when the study already owns coverage polygons. Convert Shapefile → GeoJSON first (`ogr2ogr -f GeoJSON` or geopandas `.to_json()`).

Clip/simplify recipes (python stdlib, no geopandas needed): filter features by bbox intersect, simplify rings by minimum point spacing, Sutherland–Hodgman polygon clip against the map bbox; the template additionally SVG-clips rendering to the frame, so features may extend past the bbox.

**Print export** (v0.13.0): identical module to the other template-native engines — `SPEC.export: { width_mm, dpi, font_family }`, SVG in mm units, PNG deterministic (`px = mm / 25.4 · dpi`). See SKILL.md §6b.

## Spec (fills `/*__SPEC__*/` as `const SPEC = {...}`)

```js
{
  title: "eDNA sampling sites, Klang Islands",
  subtitle: "Zones A–D · basemap: Natural Earth 10m + OSM islands (ODbL)",   // optional grey line
  width: 900, height: 720,             // nominal viewBox
  projection: "mercator",              // mercator | equirectangular
  bbox: { lon_min: 100.95, lat_min: 2.55, lon_max: 101.85, lat_max: 3.45 },
                                       // optional; default = auto-fit to all data
  basemap: {
    land: <FeatureCollection>,         // embedded GeoJSON (Polygon/MultiPolygon)
    land_fill: "#e8e4d8", land_stroke: "#8a8a7a",   // land_stroke_width optional
    ocean_color: "#cfe3f0",
    graticule: false                   // true = lat/lon grid behind land
  },
  layers: [                            // drawn in order: polygons/lines under points
    { type: "polygons", label: "Mangrove cover", features: <FC>,
      fill: "#7fbf7b", fill_opacity: 0.5, stroke: "#3a6b3a", stroke_width: 1 },
    { type: "lines", label: "Klang River", features: <FC|LineString>,
      stroke: "#4477aa", width: 2, dash: "6 3" },
    { type: "points", label: "eDNA sampling site",        // label → legend row
      items: [ { lon: 101.375, lat: 2.805, label: "Zone A · Pulau Carey",
                 color: "#4E79A7", size: 8, label_side: "right" } ] }
                                       // label_side: right (default) | left | top | bottom
  ],
  scale_bar: true,                     // or { length_km: 20 }; auto nice length, bottom-left
  north_arrow: true,                   // top-right; false to omit
  legend: true,                        // bottom-right box, one row per labeled layer
  export: { width_mm: 183, dpi: 300 }
}
```

## Pitfalls

- **d3 winding convention (S12 — inverted/complement fills)**: d3-geo treats polygons as SPHERICAL and picks the interior by winding — exterior rings must be **clockwise** (holes counterclockwise), the OPPOSITE of the GeoJSON RFC. A counterclockwise ring fills its planar complement (the rest of the world → whole map turns land-colored). The template normalizes winding (shoelace test per ring) before rendering, so valid GeoJSON of either winding renders correctly — but if you render GeoJSON with raw d3 elsewhere, reverse CCW exterior rings yourself.
- **Never fill multiple land features as ONE path with `fill-rule: evenodd`**: overlapping features (e.g. an OSM island inside a coarser Natural Earth mainland polygon) XOR to water. The template renders one path per feature; keep it that way.
- **Derive marker coordinates from the geometry, never from memory**: compute the centroid of the site's polygon (the OSM relation geometry you fetched) — hand-recalled coordinates are routinely kilometres off (a Pulau Ketam marker was plotted 10 km north of the island).
- **Natural Earth ≠ local detail**: NE 10m has ~44 coastline vertices in a 1° Klang bbox and omits mangrove islands entirely. For island-scale maps pull OSM (Overpass) or project-owned polygons; NE mainland + OSM islands can be merged, but then drop the coarse NE island pieces (they double-cover the OSM ones).
- **Ring assembly traps**: (a) already-closed fragments must be routed to rings before chaining or they re-match themselves forever; (b) the two "prepend" branches of greedy chaining MUST pop the consumed fragment or the chain flips between fragments infinitely; (c) chains that leave the query bbox must be closed along the bbox BORDER (not a straight chord — it cuts across land and inverts the fill); verify orientation with a known-land point (ray cast) and reverse if needed.
- **Degenerate rings**: tiny islets collapse to <4 points after simplification and crash d3 (sub-4-point polygon rings) — drop them.
- **Overpass etiquette**: POST (GET gives 406 without a User-Agent), set a User-Agent, keep bbox queries small; relations need ring assembly (`role: "outer"` fragments chained by matching endpoints).
- **HTML size**: every geometry is embedded. Clip + simplify at build time; a regional 10m basemap should land at tens–low hundreds of KB, not MBs.
- **Ring closure**: unclosed rings silently break (the template skips malformed rings); holes work via `fill-rule: evenodd` when stored as sibling rings of the polygon.
- **Meridian-crossing data** (lon > 180 vs < −180 mixed): normalize to one convention before embedding.

## Build helper

`bin/gis_prep.py` (python3 stdlib only) implements the verified pipeline:

```bash
# OSM coastline -> land rings (fetch, assemble, border-close, orient, simplify)
python3 bin/gis_prep.py overpass "2.45,100.85,3.55,101.98" land.json \
    --tol 0.0002 --land-pt 101.7,3.0 --sea-pt 101.05,3.1
# retry from a cached Overpass response after 429/504 (no second fetch)
python3 bin/gis_prep.py overpass "..." land.json --cache overpass_response.json ...
# clip/simplify an existing GeoJSON (project GIS export) to the map bbox
python3 bin/gis_prep.py clip input.geojson land.json "100.95,2.55,101.85,3.45" --tol 0.0002
```

`--land-pt`/`--sea-pt` are a known-land and a known-sea lon/lat used to verify ring orientation — pick them from the map region (a mistake here silently inverts the map; the sea point must be in OPEN WATER, the land point well inland).
- **GeoJSON in, map out — no basemap magic**: the template draws exactly the geometry you embed. An empty/missing `basemap.land` renders points on plain ocean; that is usually a data-sourcing failure, not a template bug.
- **Natural Earth ≠ local detail**: NE 10m omits islands below ~2–5 km². For island-scale maps pull OSM (Overpass) or project-owned polygons; combine NE (mainland) + OSM (islands) FeatureCollections into one `basemap.land` if needed.
- **Overpass etiquette**: POST (GET gives 406 without a UA), set a User-Agent, keep bbox queries small; relations need ring assembly (`role: "outer"` fragments chained by matching endpoints) — a plain `out geom` relation has fragmented coastline ways.
- **HTML size**: every geometry is embedded. Clip + simplify at build time; a regional 10m basemap should land at tens–low hundreds of KB, not MBs.
- **Ring closure**: OSM relation outers must be chained into closed rings before use as Polygon rings; unclosed rings silently drop (the template skips `ring[0] != ring[-1]`).
- **Hole rendering**: land/coverage polygons use `fill-rule: evenodd`, so holes (lakes, enclaves) work if holes are sibling rings of the polygon.
- **Meridian-crossing data** (lon > 180 vs < −180 mixed): normalize to one convention before embedding; the projection will not unwrap for you.

## Worked examples

- `geomap-sampling-sites.html` — Klang Islands eDNA sites: full OSM coastline basemap (mainland + 9 named island polygons, ring-assembled with `bin/gis_prep.py`), markers at true OSM island centroids, auto scale bar (20 km), north arrow, legend; 187 KB self-contained HTML.
- `geomap-coverage.html` — polygon/line layers: demo mangrove-cover polygons + schematic Klang River over the same basemap (the "project GIS export" input path).

## Reference ecosystem (heavy GIS stays here, chartz renders)

See `references/gis.md` — geopandas/shapely/pyproj/rasterio/cartopy (Python), sf/terra/tmap/ggspatial (R) for spatial analysis and projection work; chartz GeoMap/PlotlyGeo sit at the last mile (GeoJSON + coordinate tables → one self-contained print-sized HTML).