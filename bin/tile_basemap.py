#!/usr/bin/env python3
"""tile_basemap.py — raster tile basemap for chartz GeoMap (engines/geomap.md).

Fetches free XYZ tile basemaps (same providers as the geocoding skill's `map`
subcommand), stitches them to the map frame, and emits the spec fragment
`basemap.raster` — a base64 data-URI PNG plus its exact lon/lat bbox — for
embedding into a chartz GeoMap spec. The raster is a web-mercator crop, so
overlays drawn with the template's d3.geoMercator (fitExtent to the raster
bbox) align pixel-perfectly.

Tile usage policies: OSM/Carto tiles require attribution (auto-set per
provider); keep zoom <= 18 and don't bulk-download. Tiles are fetched at
BUILD time and embedded — the delivered HTML renders fully offline.

Usage:
  python3 bin/tile_basemap.py --bbox 100.95,2.55,101.85,3.45 \
      --aspect 900/720 --topology satellite --out basemap.json [--zoom 11]

  --bbox   lon_min,lat_min,lon_max,lat_max (the visible map frame)
  --aspect W/H of the map frame (SPEC.width/SPEC.height); the helper expands
           the bbox in mercator space to match, so the raster fills the frame
           exactly and vector overlays stay aligned
  --out    writes {"raster": {...}} — paste as SPEC.basemap.raster

Requires Pillow (build-time only): pip install Pillow
"""
import argparse
import base64
import io
import json
import math
import time
import urllib.request

TILE_PROVIDERS = {
    "street": "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
    "humanitarian": "https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    "satellite": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "topo": "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    "esri-topo": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    "esri-streets": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    "esri-gray": "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    "carto-light": "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    "carto-dark": "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
}
ATTRIBUTION = {
    "street": "© OpenStreetMap contributors",
    "humanitarian": "© OpenStreetMap contributors, HOT style",
    "topo": "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors",
    "satellite": "© Esri World Imagery",
    "esri-topo": "© Esri World Topo Map",
    "esri-streets": "© Esri World Street Map",
    "esri-gray": "© Esri, © OpenStreetMap contributors",
    "carto-light": "© CARTO, © OpenStreetMap contributors",
    "carto-dark": "© CARTO, © OpenStreetMap contributors",
}
UA = "chartz-tile_basemap/1.0 (chartz skill figure builder)"
TILE = 256


def lon_to_frac(lon):
    return (lon + 180.0) / 360.0


def lat_to_frac(lat):
    lat = max(-85.05112878, min(85.05112878, lat))
    r = math.radians(lat)
    return (1.0 - math.log(math.tan(r) + 1.0 / math.cos(r)) / math.pi) / 2.0


def frac_to_lat(f):
    return math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * f))))


def expand_to_aspect(lon0, lat0, lon1, lat1, aspect):
    """Expand a bbox in unit web-mercator space until width/height matches
    `aspect` (the map frame's pixel aspect). Returns the expanded bbox."""
    fx0, fx1 = lon_to_frac(lon0), lon_to_frac(lon1)
    fy0, fy1 = lat_to_frac(lat1), lat_to_frac(lat0)      # fy0 = top (max lat)
    w, h = fx1 - fx0, fy1 - fy0
    if w / h < aspect:                                   # too narrow -> widen in lon
        need = h * aspect
        cx = (fx0 + fx1) / 2
        return (cx - need / 2) * 360 - 180, lat0, (cx + need / 2) * 360 - 180, lat1
    need = w / aspect                                    # too short -> extend in lat
    fc = (fy0 + fy1) / 2
    return lon0, frac_to_lat(fc - need / 2), lon1, frac_to_lat(fc + need / 2)


def fetch_tile(z, x, y, topology, retries=3):
    url = TILE_PROVIDERS[topology].format(z=z, x=x % (1 << z), y=y)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(1.5 * (i + 1))


def render_raster(lon0, lat0, lon1, lat1, topology="street", zoom=None, min_px=900):
    """Fetch + stitch tiles covering the bbox. Returns (png_bytes, exact_bbox)."""
    try:
        from PIL import Image
    except ImportError:
        raise RuntimeError("Pillow required (build-time only): pip install Pillow")
    if zoom is None:
        span = max(lon1 - lon0, 1e-6)
        zoom = max(1, min(18, round(math.log2(360.0 / span * min_px / TILE))))
    fx0, fx1 = lon_to_frac(lon0), lon_to_frac(lon1)
    fy0, fy1 = lat_to_frac(lat1), lat_to_frac(lat0)      # fy0 = top (max lat)
    tx0, tx1 = int(math.floor(fx0 * (1 << zoom))), int(math.ceil(fx1 * (1 << zoom)))
    ty0, ty1 = int(math.floor(fy0 * (1 << zoom))), int(math.ceil(fy1 * (1 << zoom)))
    if (tx1 - tx0) * (ty1 - ty0) > 400:
        raise ValueError(f"zoom {zoom} would fetch {(tx1-tx0)*(ty1-ty0)} tiles — lower the zoom")
    canvas = Image.new("RGB", ((tx1 - tx0) * TILE, (ty1 - ty0) * TILE), (204, 204, 204))
    n = 1 << zoom
    for tx in range(tx0, tx1):
        for ty in range(ty0, ty1):
            if not (0 <= ty < n):
                continue
            blob = fetch_tile(zoom, tx, ty, topology)
            canvas.paste(Image.open(io.BytesIO(blob)).convert("RGB"),
                         ((tx - tx0) * TILE, (ty - ty0) * TILE))
    img = canvas.crop((round(fx0 * n * TILE) - tx0 * TILE, round(fy0 * n * TILE) - ty0 * TILE,
                       round(fx1 * n * TILE) - tx0 * TILE, round(fy1 * n * TILE) - ty0 * TILE))
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue(), (lon0, lat0, lon1, lat1)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--bbox", required=True, help="lon_min,lat_min,lon_max,lat_max")
    ap.add_argument("--aspect", default="900/720", help="map frame aspect W/H (default 900/720)")
    ap.add_argument("--topology", default="street", choices=sorted(TILE_PROVIDERS))
    ap.add_argument("--zoom", type=int, default=None, help="force zoom (default auto)")
    ap.add_argument("--min-px", type=int, default=900, help="target width in px for auto-zoom")
    ap.add_argument("--out", required=True, help="output .json fragment path")
    a = ap.parse_args()
    lon0, lat0, lon1, lat1 = (float(v) for v in a.bbox.split(","))
    w, h = (float(v) for v in a.aspect.split("/"))
    lon0, lat0, lon1, lat1 = expand_to_aspect(lon0, lat0, lon1, lat1, w / h)
    png, (elo0, elat0, elo1, elat1) = render_raster(lon0, lat0, lon1, lat1, a.topology, a.zoom, a.min_px)
    frag = {"raster": {
        "data": "data:image/png;base64," + base64.b64encode(png).decode(),
        "bbox": {"lon_min": elo0, "lat_min": elat0, "lon_max": elo1, "lat_max": elat1},
        "attribution": ATTRIBUTION[a.topology],
        "topology": a.topology,
    }}
    with open(a.out, "w") as fh:
        json.dump(frag, fh)
    print(f"{a.out}: {len(png)//1024} KB PNG, topology={a.topology}, "
          f"bbox=({elo0:.4f},{elat0:.4f},{elo1:.4f},{elat1:.4f}) — paste as SPEC.basemap.raster")


if __name__ == "__main__":
    main()