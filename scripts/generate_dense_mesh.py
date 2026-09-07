#!/usr/bin/env python3
import json
import math

COASTLINES = {
    "north_america": [
        [72, -156], [71, -140], [69, -135], [68, -120], [65, -100], [60, -90], [62, -80],
        [62, -65], [55, -60], [50, -56], [47, -53], [44, -64], [42, -70], [37, -76],
        [32, -80], [25, -80], [25, -82], [29, -84], [30, -88], [28, -96], [22, -97],
        [19, -96], [16, -93], [15, -88], [13, -87], [9, -83], [8, -77], [7, -81],
        [10, -85], [14, -92], [16, -98], [20, -105], [25, -110], [32, -117], [37, -122],
        [42, -124], [48, -125], [54, -130], [58, -136], [60, -145], [58, -155], [60, -165],
        [66, -168], [70, -162], [72, -156]
    ],
    "south_america": [
        [12, -72], [10, -62], [6, -58], [5, -52], [0, -50], [-3, -40], [-6, -35],
        [-12, -37], [-18, -39], [-23, -43], [-28, -48], [-34, -53], [-38, -57],
        [-45, -65], [-52, -68], [-55, -66], [-54, -72], [-48, -75], [-40, -74],
        [-33, -72], [-23, -70], [-16, -75], [-10, -78], [-5, -81], [2, -79], [8, -77], [12, -72]
    ],
    "europe": [
        [71, 26], [68, 15], [62, 5], [58, 6], [54, 9], [53, 5], [51, 2], [48, -4],
        [44, -1], [43, -8], [37, -9], [36, -6], [37, -2], [41, 1], [43, 4], [44, 9],
        [41, 15], [38, 15], [40, 18], [40, 24], [37, 23], [39, 26], [41, 29], [44, 29],
        [46, 31], [47, 39], [45, 37], [44, 34], [47, 30], [54, 20], [56, 13], [59, 11],
        [60, 19], [65, 23], [70, 28], [71, 26]
    ],
    "british_isles": [
        [58, -5], [58, -2], [54, 0], [51, 1], [50, -5], [53, -5], [55, -6], [58, -5]
    ],
    "africa": [
        [36, -5], [37, 10], [33, 11], [32, 20], [31, 32], [28, 34], [22, 37],
        [12, 44], [12, 51], [5, 48], [-2, 41], [-11, 40], [-25, 33], [-34, 26],
        [-34, 18], [-28, 16], [-22, 14], [-15, 12], [-5, 12], [4, 9], [5, 0],
        [5, -7], [8, -13], [12, -16], [16, -16], [22, -17], [28, -13], [33, -9], [36, -5]
    ],
    "madagascar": [
        [-12, 49], [-16, 50], [-25, 47], [-25, 44], [-17, 44], [-12, 49]
    ],
    "asia_eurasia": [
        [77, 105], [73, 80], [70, 60], [68, 50], [60, 40], [50, 40], [45, 47],
        [40, 50], [37, 50], [30, 48], [25, 55], [24, 60], [25, 67], [20, 70],
        [10, 76], [8, 77], [13, 80], [18, 83], [22, 89], [22, 92], [16, 94],
        [10, 99], [5, 103], [1, 104], [6, 108], [11, 109], [20, 107], [22, 114],
        [25, 119], [31, 122], [38, 118], [40, 124], [35, 129], [38, 129], [42, 131],
        [48, 135], [55, 137], [60, 145], [58, 160], [65, 170], [66, 179], [70, 178],
        [72, 150], [75, 135], [77, 105]
    ],
    "japan": [
        [45, 142], [43, 145], [35, 140], [33, 131], [34, 133], [38, 139], [41, 141], [45, 142]
    ],
    "australia": [
        [-12, 132], [-12, 136], [-17, 139], [-12, 142], [-18, 146], [-25, 153],
        [-33, 152], [-38, 146], [-38, 140], [-35, 136], [-32, 132], [-32, 125],
        [-35, 117], [-32, 115], [-25, 113], [-20, 118], [-16, 123], [-15, 129], [-12, 132]
    ],
    "greenland": [
        [82, -30], [76, -20], [70, -25], [60, -44], [65, -52], [72, -56],
        [78, -68], [82, -50], [82, -30]
    ]
}

def point_in_polygon(lat, lon, polygon):
    n = len(polygon)
    inside = False
    p1lat, p1lon = polygon[0]
    for i in range(1, n + 1):
        p2lat, p2lon = polygon[i % n]
        if min(p1lat, p2lat) < lat <= max(p1lat, p2lat):
            if lon <= max(p1lon, p2lon):
                if p1lat != p2lat:
                    xinters = (lat - p1lat) * (p2lon - p1lon) / (p2lat - p1lat) + p1lon
                if p1lon == p2lon or lon <= xinters:
                    inside = not inside
        p1lat, p1lon = p2lat, p2lon
    return inside

def geo_dist(p1, p2):
    lat1, lon1 = p1
    lat2, lon2 = p2
    dlat = lat1 - lat2
    dlon = (lon1 - lon2) * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(dlat, dlon)

all_edges = set()

for c_name, poly in COASTLINES.items():
    # 1. Add perimeter boundary edges
    for i in range(len(poly) - 1):
        p1 = (poly[i][0], poly[i][1])
        p2 = (poly[i+1][0], poly[i+1][1])
        if p1 != p2:
            edge = tuple(sorted([p1, p2]))
            all_edges.add(edge)
            
    # 2. Find bounding box
    min_lat = min(p[0] for p in poly)
    max_lat = max(p[0] for p in poly)
    min_lon = min(p[1] for p in poly)
    max_lon = max(p[1] for p in poly)
    
    # Generate internal lattice points
    step = 5.0 # degrees
    internal_pts = []
    lat = min_lat + step
    while lat < max_lat:
        lon = min_lon + step
        while lon < max_lon:
            if point_in_polygon(lat, lon, poly):
                internal_pts.append((round(lat, 1), round(lon, 1)))
            lon += step
        lat += step

    all_pts = [(p[0], p[1]) for p in poly] + internal_pts

    # 3. Connect points within threshold
    max_dist = step * 1.85
    for i in range(len(all_pts)):
        p1 = all_pts[i]
        dists = []
        for j in range(len(all_pts)):
            if i == j:
                continue
            p2 = all_pts[j]
            d = geo_dist(p1, p2)
            if d <= max_dist:
                dists.append((d, p2))
        dists.sort(key=lambda x: x[0])
        for _, p2 in dists[:6]:
            edge = tuple(sorted([p1, p2]))
            all_edges.add(edge)

formatted_edges = [[[round(e[0][0], 1), round(e[0][1], 1)], [round(e[1][0], 1), round(e[1][1], 1)]] for e in all_edges]

print(f"Generated {len(formatted_edges)} high-density geodesic edges across {len(COASTLINES)} landmasses.")

output_data = {
    "coastlines": COASTLINES,
    "edges": formatted_edges
}

with open("/Users/slava/Antigravity/argus/frontend/js/world_mesh.json", "w") as f:
    json.dump(output_data, f)

print("Saved to /Users/slava/Antigravity/argus/frontend/js/world_mesh.json")
