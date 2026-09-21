# Engine 15 — GeoMap (site maps on raster tile basemaps, d3-geo overlays)

**Routing row:** see SKILL.md §1 row 15 — `templates/geomap.html` · §5k · `engines/geomap.md`

**Scope:** local/regional maps with real-world context — sampling-site maps on satellite or street imagery, coverage polygons, study-area figures. The basemap is a **raster tile image** (OSM/Esri/Carto, fetched at build time via `bin/tile_basemap.py` and embedded as a data URI — the delivered HTML renders fully offline); study data renders as vector on top: coverage polygons, lines, labeled site markers, scale bar, north arrow, legend. The whole figure is one self-contained HTML with the shared print-export module.

**Not for:** world/continent-scale reference figures with numeric region values (use Plotly choropleths or geopandas), and interactive slippy maps (use Leaflet/folium — chartz figures are static and self-contained). Place-name → coordinate resolution: use the **geocoding skill** (`skills/geocoding`), then hand the coordinates to this engine.

**Print export:** identical module to the other template-native engines — `SPEC.export: { width_mm, dpi, font_family }`, SVG in mm units, PNG deterministic (`px = mm / 25.4 · dpi`). With a raster basemap, Download SVG embeds the imagery as an image element (the tiles themselves cannot be vectorized); the overlays remain true vector. See SKILL.md §6b.

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
    // vector alternative: { "land": <FeatureCollection>, "land_fill": "...",
    //   "land_stroke": "...", "ocean_color": "...", "graticule": false }
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
  scale_bar: true,                     // or { length_km: 20 }; auto nice length, bottom-left
  north_arrow: true,                   // top-right; false to omit (white-haloed for rasters)
  legend: true,                        // bottom-right box, one row per labeled layer
  export: { width_mm: 183, dpi: 300 }
}
```

The projection always fits `raster.bbox` when a raster is present (any spec-level `bbox` is ignored by design) — that is what keeps lat/lon overlays pixel-aligned with the imagery: d3.geoMercator and web-mercator tiles are the same projection.

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

## Worked example

- `geomap-sampling-sites.html` — Klang Islands eDNA sites on an **Esri World Imagery tile basemap**, markers at island centroids (coordinates verified against the OSM island geometry), scale bar, north arrow, legend; ~1 MB self-contained HTML.

## Reference ecosystem (heavy GIS stays here, chartz renders)

For spatial analysis (reprojection, spatial joins, raster math), use geopandas/shapely/pyproj/rasterio/cartopy (Python) or sf/terra/tmap (R) and hand this engine the finished coordinates/GeoJSON. For place-name resolution and standalone tile PNGs, see the **geocoding skill** (`skills/geocoding`).