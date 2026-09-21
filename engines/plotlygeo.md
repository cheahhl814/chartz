# Engine 15 — PlotlyGeo (site maps, choropleths, global context maps)

**Routing row:** see SKILL.md §1 row 15 — `templates/plotly-geo.html` · §5k · `engines/plotlygeo.md`

**Scope:** geographic figures where coordinates (lon/lat) are the frame — sampling-site maps, regional choropleths (values per country/region), global context maps, coverage polygons drawn from custom GeoJSON. Built on the **same pinned plotly.js 4.1.1** as the Plotly engine (no new dependency) plus a **vendored Natural Earth world_50m topology** (`assets/world_50m.json`, inlined in the template) so geo renders fully offline.

**Not for:** satellite/tile basemap figures (raster imagery — use QGIS, cartopy + contextily, or a screenshot of a web map), and **not** for local maps where small-island coastline detail matters (Natural Earth 50m base omits islands < ~10 km²; use the GeoMap engine, engines/geomap.md, which accepts 10m GeoJSON).

**Template detail:** `templates/plotly-geo.html` = the plotly template + `window.PlotlyGeoAssets = {topojson: {world_50m: …}}` preloaded before `Plotly.newPlot`. Plotly skips its own `fetchTopojson()` when the asset is preloaded — verified fully offline from `file://`. Do not strip that script block.

**Print export** (v0.13.0): identical `SPEC.export` wiring to the Plotly engine — `toImageButtonOptions` camera, `format: "svg"` default (true vector; geo renders in the SVG layer, so exports carry the basemap too). See SKILL.md §6b.

## Spec (fills `/*__SPEC__*/` as `const SPEC = {...}`)

```js
{
  data: [
    {
      type: "scattergeo", mode: "markers+text",
      lat: [2.805, 3.005], lon: [101.375, 101.325],
      text: ["Zone A · Pulau Carey", "Zone B · Pulau Indah"],
      textposition: "bottom right",         // top left | bottom right | ... per point (array ok)
      marker: { size: 13, color: ["#4E79A7", "#F28E2B"],
                line: { width: 1.5, color: "white" } },
      hoverinfo: "text", hovertext: ["...", "..."]
    }
    // choropleth: { type: "choropleth", geojson: <FeatureCollection>, featureidkey: "properties.id",
    //               locations: [<feature ids>], z: [...], colorscale: [...], marker: {opacity} }
    //   — custom polygons (coverage, admin regions) via geojson + featureidkey; z drives the fill
  ],
  layout: {
    title: { text: "eDNA sampling sites, Klang Islands" },
    geo: {
      lonaxis: { range: [101.0, 101.7] },   // REQUIRED for extent — see pitfall 1
      lataxis: { range: [2.65, 3.3] },
      projection: { type: "mercator" },     // mercator | equirectangular | natural earth | orthographic ...
      showland: true, landcolor: "#e8e4d8",
      showocean: true, oceancolor: "#cfe3f0",
      showcoastlines: true, coastlinecolor: "#666",
      showcountries: false,                 // true for country borders
      resolution: 50,                       // 110 | 50 (50 = max detail; no 10m in plotly)
      showframe: false, bgcolor: "#cfe3f0"
    },
    margin: { l: 10, r: 10, t: 50, b: 10 }, font: { size: 13 }
  },
  config: { responsive: true, displaylogo: false },
  export: { format: "svg", scale: 3 }
}
```

## Pitfalls

- **`geo.center` + `geo.scale` are silently ignored** when set together with default fit — set the extent with `geo.lonaxis.range` / `geo.lataxis.range` (verified). A blank geo with the title drawn usually means the topology fetch failed; the template's preloaded asset prevents this.
- **resolution: 50 is the maximum** — plotly has no 10m base. Small islands (Pulau Ketam-class) are absent from the 50m base at local zooms; overlay them as custom GeoJSON via a `choropleth`/`scattergeo` trace, or switch to the GeoMap engine for island-scale maps.
- **Custom polygons** (mangrove cover, protected areas): `choropleth` trace with `geojson` + `featureidkey` + `locations` + `z`. The GeoJSON is embedded in the SPEC — clip/trim it to the map bbox at build time to keep the HTML small.
- **Aspect**: the geo subplot keeps the projection's aspect; with `responsive: true` the map fills the 65vh container. For print-width figures set `SPEC.export.width_mm` and take the SVG export.
- **Offline**: the vendored topology makes geo work from `file://` with no network beyond the plotly.js CDN pin. If you swap the pin (§7), the geo assets stay compatible (plotly's own topology naming).

## Worked examples

- `plotly-site-map.html` — Klang Islands eDNA sampling sites, four zones color-coded, coast + land from the vendored topology, vector SVG export.

## Reference ecosystem (heavy GIS stays here, chartz renders)

When the task is *analysis* (reprojection, spatial joins, raster math, zonal stats), do it in Python/R first and hand chartz the finished coordinates/polygons:

- **Python**: `geopandas` (vector dataframes), `shapely` (geometry ops), `pyproj` (projections/CRS), `rasterio` (rasters), `cartopy` (publication maps in matplotlib, ships Natural Earth), `contextily` (tile basemaps → matplotlib, network required), `folium` (interactive Leaflet HTML — depends on CDN tiles at view time, not self-contained)
- **R**: `sf` (simple features), `terra` (rasters), `tmap` v4 (thematic maps, static+interactive), `ggspatial` (scale bars, north arrows in ggplot), `rnaturalearth` (basemap data), `leaflet` (interactive, self-contained widget)
- chartz PlotlyGeo/GeoMap sit at the **last mile**: turning those tools' exported GeoJSON + coordinate tables into one self-contained, print-sized HTML figure.