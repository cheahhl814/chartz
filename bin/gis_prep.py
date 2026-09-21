#!/usr/bin/env python3
"""gis_prep.py — basemap preparation for chartz GeoMap (engines/geomap.md).

Builds an embeddable GeoJSON land FeatureCollection from OpenStreetMap
coastline data (Overpass API) with proper ring assembly — the step that
hand-rolled Sutherland–Hodgman clips get wrong (they bridge disjoint land
parts along the clip border and can invert the fill).

Pipeline:
  1. fetch natural=coastline ways in a bbox (Overpass POST, User-Agent required)
  2. chain coastline fragments into closed loops by shared endpoints
     (loops that exit the bbox are closed along the bbox border)
  3. orientation sanity: a known-land point must test inside its ring;
     if the sea tests inside instead, the ring is reversed
  4. simplify rings (min point spacing) to keep the HTML small

Usage:
  python3 bin/gis_prep.py overpass "2.45,100.85,3.55,101.98" land.json \
      [--url OVERPASS_URL] [--tol 0.0002] [--land-pt lon,lat] [--sea-pt lon,lat]

  (bbox format: lat_min,lon_min,lat_max,lon_max — Overpass order south,west,north,east)

Requires only the python3 standard library.
"""
import json
import math
import sys
import urllib.parse
import urllib.request

UA = "chartz-gis_prep/1.0 (chartz skill basemap builder)"


def overpass_coastline(bbox, url="https://overpass-api.de/api/interpreter"):
    """bbox = 'lat_min,lon_min,lat_max,lon_max' (Overpass order). Returns ways' geometry."""
    q = (f"[out:json][timeout:120];"
         f"way[\"natural\"=\"coastline\"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});out geom;")
    data = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "application/json"})
    d = json.loads(r.read().decode("utf-8"))
    # Overpass 'out geom' point format: {"lat": .., "lon": ..} -> normalize to [lon, lat]
    return [[[p["lon"], p["lat"]] for p in e["geometry"]]
            for e in d.get("elements", []) if e.get("geometry")]


def assemble_rings(fragments):
    """Chain coastline fragments (lists of [lon, lat]) into closed loops by matching
    endpoints exactly (shared OSM nodes carry identical coordinates).
    Returns (closed_rings, open_chains). Open chains = coastline pieces that leave the
    query bbox (e.g. the mainland coast) — close them with close_chain_to_bbox() before
    use; closing with a straight chord would cut across land."""
    frags, rings = [], []
    for f in fragments:
        pts = [tuple(p) for p in f]
        if len(pts) >= 4 and pts[0] == pts[-1]:
            rings.append(pts)          # already a closed loop (e.g. a complete island way)
        elif len(pts) >= 2:
            frags.append(pts)
    chains = []
    while frags:
        r = frags.pop(0)
        grew = True
        while grew and r[0] != r[-1]:
            grew = False
            for i, f in enumerate(frags):
                if r[-1] == f[0]:
                    r.extend(f[1:]); frags.pop(i); grew = True; break
                if r[-1] == f[-1]:
                    r.extend(list(reversed(f))[1:]); frags.pop(i); grew = True; break
                if r[0] == f[-1]:
                    r[:] = f[:-1] + r; frags.pop(i); grew = True; break
                if r[0] == f[0]:
                    r[:] = list(reversed(f))[:-1] + r; frags.pop(i); grew = True; break
        (rings if r[0] == r[-1] else chains).append(r)
    return rings, chains


def _corner_between(edge_a, edge_b, corners):
    """bbox corners encountered walking edge_a -> edge_b in one rotation direction."""
    i = corners.index(edge_a)
    order = corners[i:] + corners[:i]
    j = order.index(edge_b)
    return order[:j + 1]


def close_chain_to_bbox(chain, bbox, land_pt, sea_pt):
    """Close an open coastline chain along the bbox border. The chain's two endpoints
    are clamped to the nearest border edge; the closure walks the border corners in
    whichever rotation direction puts land_pt inside and sea_pt outside (both test
    points are then verified; raises if neither closure qualifies)."""
    lat0, lon0, lat1, lon1 = bbox
    corners = ["W", "N", "E", "S"]  # rotation order: W->N->E->S->W
    corner_pt = {"W": (lon0, lat0), "N": (lon0, lat1), "E": (lon1, lat1), "S": (lon1, lat0)}
    #        W = bottom-left, N = top-left, E = top-right, S = bottom-right

    def nearest_edge(p):
        lon, lat = p
        best = min(
            [(("W", (lon0, lat)), abs(lon - lon0)),
             (("E", (lon1, lat)), abs(lon - lon1)),
             (("S", (lon, lat0)), abs(lat - lat0)),
             (("N", (lon, lat1)), abs(lat - lat1))],
            key=lambda t: t[1])
        return best[0][0]

    ea, eb = nearest_edge(chain[-1]), nearest_edge(chain[0])
    pa = (lon0 if ea == "W" else lon1 if ea == "E" else chain[-1][0],
          lat0 if ea == "S" else lat1 if ea == "N" else chain[-1][1])
    pb = (lon0 if eb == "W" else lon1 if eb == "E" else chain[0][0],
          lat0 if eb == "S" else lat1 if eb == "N" else chain[0][1])

    best = None
    for rot in (0, 1):
        corners = ["W", "N", "E", "S"] if rot == 0 else ["W", "S", "E", "N"]
        path = _corner_between(ea, eb, corners)
        closure = [pa] + [corner_pt[c] for c in path[1:]] + [pb]
        ring = list(chain) + closure + [chain[0]]
        for cand in (ring, list(reversed(ring))):
            if pip(land_pt, cand) and not pip(sea_pt, cand):
                best = cand
                break
        if best:
            break
    if best is None:
        raise ValueError("no bbox-border closure puts land_pt inside and sea_pt outside — "
                         "check --land-pt/--sea-pt or grow the query bbox")
    return best


def pip(pt, ring):
    x, y = pt
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            if x1 + (y - y1) * (x2 - x1) / (y2 - y1) > x:
                inside = not inside
    return inside


def simplify_ring(ring, tol):
    out = [ring[0]]
    for p in ring[1:]:
        if abs(p[0] - out[-1][0]) > tol or abs(p[1] - out[-1][1]) > tol:
            out.append(p)
    if len(out) > 2 and out[0] != out[-1]:
        out.append(out[0])
    return out


def build(bbox, tol=0.0002, land_pt=None, sea_pt=None, url=None, fragments=None):
    """bbox: (lat_min, lon_min, lat_max, lon_max) Overpass order. Returns FeatureCollection.
    land_pt/sea_pt (lon, lat) are required when the coastline leaves the bbox (mainland
    chains): they drive the border-closure orientation check."""
    frags = fragments if fragments is not None else (
        overpass_coastline(bbox, url) if url else overpass_coastline(bbox))
    rings, chains = assemble_rings(frags)
    la, lo_a, lb, lo_b = bbox  # lat_min, lon_min, lat_max, lon_max
    if chains and not (land_pt and sea_pt):
        raise ValueError("bbox cuts the coastline (open chains present) — provide "
                         "--land-pt and --sea-pt for the border-closure orientation check")
    feats = []
    for ring in rings + [close_chain_to_bbox(c, bbox, land_pt, sea_pt) for c in chains]:
        xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
        if max(xs) < lo_a or min(xs) > lo_b or max(ys) < la or min(ys) > lb:
            continue
        ring = simplify_ring(ring, tol)
        if len(ring) < 4:
            continue  # degenerate after simplification (tiny islet collapses to a point;
                      # d3-geo crashes on sub-4-point polygon rings)
        feats.append({"type": "Feature", "properties": {"source": "OpenStreetMap"},
                      "geometry": {"type": "Polygon", "coordinates": [ring]}})
    return {"type": "FeatureCollection", "features": feats}


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    sub = ap.add_subparsers(dest="cmd", required=True)
    po = sub.add_parser("overpass", help="fetch OSM coastline, assemble land rings, save GeoJSON")
    po.add_argument("bbox", help="'lat_min,lon_min,lat_max,lon_max' (Overpass order)")
    po.add_argument("out")
    po.add_argument("--url", default=None, help="alternate Overpass endpoint")
    po.add_argument("--tol", type=float, default=0.0002, help="simplify tolerance in degrees (~0.0002 = 20 m)")
    po.add_argument("--land-pt", default=None, help="lon,lat of a known-land point (orientation check)")
    po.add_argument("--sea-pt", default=None, help="lon,lat of a known-sea point (orientation check)")
    po.add_argument("--cache", default=None, help="path to a cached Overpass JSON response (skips the network fetch; useful after 429/504 rate limits)")
    pc = sub.add_parser("clip", help="clip+simplify an existing GeoJSON FeatureCollection to a bbox")
    pc.add_argument("infile"); pc.add_argument("outfile")
    pc.add_argument("bbox", help="lon_min,lat_min,lon_max,lat_max")
    pc.add_argument("--tol", type=float, default=0.0002)
    a = ap.parse_args()
    if a.cmd == "overpass":
        bbox = tuple(float(x) for x in a.bbox.split(","))
        land_pt = tuple(float(x) for x in a.land_pt.split(",")) if a.land_pt else None
        sea_pt = tuple(float(x) for x in a.sea_pt.split(",")) if a.sea_pt else None
        if a.cache:
            d = json.load(open(a.cache))
            frags = []
            for e in d.get("elements", []):
                g = e.get("geometry")
                if not g:
                    continue
                # Overpass 'out geom' points are {"lat": .., "lon": ..}; normalize to [lon, lat]
                if isinstance(g[0], dict):
                    g = [[p["lon"], p["lat"]] for p in g]
                frags.append(g)
            fc = build(bbox, a.tol, land_pt, sea_pt, url=a.url, fragments=frags)
        else:
            fc = build(bbox, a.tol, land_pt, sea_pt, a.url)
    else:
        lon0, lat0, lon1, lat1 = (float(x) for x in a.bbox.split(","))
        d = json.load(open(a.infile))
        kept = []
        for f in d["features"]:
            g = f["geometry"]
            polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
            for poly in polys:
                xs = [p[0] for p in poly[0]]; ys = [p[1] for p in poly[0]]
                if max(xs) < lon0 or min(xs) > lon1 or max(ys) < lat0 or min(ys) > lat1:
                    continue
                kept.append({"type": "Feature", "properties": f.get("properties", {}),
                             "geometry": {"type": "Polygon",
                                          "coordinates": [simplify_ring(r, a.tol) for r in poly]}})
        fc = {"type": "FeatureCollection", "features": kept}
    json.dump(fc, open(a.out, "w"), separators=(",", ":"))
    import os
    print(f"{a.out}: {len(fc['features'])} features, {os.path.getsize(a.out)//1024} KB")


if __name__ == "__main__":
    main()