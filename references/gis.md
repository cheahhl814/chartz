# GIS ecosystem reference — Python & R (advisory, for scoping map work)

chartz's two geo engines (PlotlyGeo, GeoMap) are **last-mile figure renderers**: they turn finished coordinates + GeoJSON into one self-contained, print-sized HTML. Spatial *analysis* (reprojection, spatial joins, raster math, zonal statistics, tile fetching) belongs in the tools below — do it first, export GeoJSON/CSV, then route the figure here. Satellite/tile-imagery basemaps remain out of chartz's scope entirely.

## Python

| Package | Role | chartz boundary |
|---|---|---|
| **geopandas** | Vector dataframes (read/write Shapefile/GeoJSON/GPKG via pyogrio), spatial joins, overlays, `.to_json()` for chartz specs | Do analysis here; hand the GeoJSON to GeoMap |
| **shapely** | Geometry primitives & ops (buffer, intersection, simplify) | Preprocess geometries before embedding |
| **pyproj** | CRS definitions & transformations (PROJ) | Reproject to EPSG:4326 before chartz (GeoMap/PlotlyGeo expect lon/lat) |
| **rasterio** | Raster I/O + math (GeoTIFF, DEMs) | Rasters never enter chartz; export contours/zonal stats as vectors |
| **cartopy** | Publication maps in matplotlib; ships Natural Earth downloaders | Rival renderer — use when a matplotlib composite is needed |
| **contextily** | XYZ tile basemaps into matplotlib (network required) | For satellite-look figures chartz cannot make |
| **folium / leaflet** | Interactive slippy-map HTML | Not self-contained (CDN tiles at view time); chartz figures are offline |
| **geodatasets, mapclassify, xyzservices** | Sample data, choropleth classification, tile-provider registry | Supporting cast |

## R

| Package | Role | chartz boundary |
|---|---|---|
| **sf** | Simple features vectors (the geoverse core) | Analysis + `st_write(..., driver="GeoJSON")` → GeoMap |
| **terra** | Raster data (successor to raster) | Rasters stay out of chartz |
| **tmap (v4)** | Thematic maps, static + interactive, one grammar | Rival renderer; strong for faceted choropleths |
| **ggspatial** | Scale bars, north arrows, annotation in ggplot | Conventions chartz GeoMap implements natively |
| **rnaturalearth / rnaturalearthdata** | Natural Earth basemap pulls | Same data chartz vendors (`assets/world_50m.json`) |
| **leaflet** | Interactive maps (self-contained widget) | Interactive-only needs |
| **spData / spDataLarge** | Example spatial datasets | Teaching |

## Which chartz engine when

- **World/continent/regional context, country choropleths, site markers on a built-in basemap** → **PlotlyGeo** (`engines/plotlygeo.md`). Basemap = vendored Natural Earth 50m topology; zero GeoJSON required; weakness: small islands missing at local zoom.
- **Local maps where coastline detail is the point** (islands, estuaries, coverage polygons) → **GeoMap** (`engines/geomap.md`). You (or the agent at build time) source GeoJSON: OSM Overpass for OSM detail, Natural Earth for context, project GIS outputs for study-owned polygons; clip + simplify to keep the HTML small.
- **Satellite/raster-imagery figures** → not chartz. QGIS, cartopy+contextily, or GeoPandas + a screenshot; chartz can overlay the extracted coordinates afterward.

## Overpass (OSM) quick recipe

```bash
curl -s -A "chartz-build/1.0" -H "Accept: application/json" \
  --data-urlencode 'data=[out:json][timeout:90];
    (relation["place"="island"](2.9,101.1,3.3,101.5););out geom;' \
  "https://overpass-api.de/api/interpreter" > islands.json
```
Relations return fragmented coastline ways under `members[].geometry` (role `outer`); chain them into closed rings by matching endpoints before use as Polygon rings. POST (not GET) with a User-Agent, or the endpoint answers 406.

## Natural Earth quick recipe

```bash
curl -sL -o ne_10m_land.geojson \
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"
# then: filter features by bbox intersect, simplify (min point spacing ~0.0002°),
# Sutherland–Hodgman clip to the map bbox (python stdlib is enough — see engines/geomap.md)
```

Sources: geopandas ecosystem docs; contextily docs (v1.7.1); Geocomputation with R ch. 9 (r.geocompx.org); tmap v4 migration notes; folium static-export limitations (GitHub issues #1850/#1985); Natural Earth 10m coastline/minor-islands pages; plotly geo configuration docs (resolution caps at 50m; `choropleth` accepts custom `geojson` + `featureidkey`).