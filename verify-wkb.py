#!/usr/bin/env python3
"""
Quick verification script to demonstrate how to use the generated WKB file.
"""

from shapely import wkb
import json

def main():
    print("🔍 Verifying NSW Boundary WKB File")
    print("=" * 40)

    # Read the WKB file
    with open('nsw_boundary_mainland.wkb', 'rb') as f:
        wkb_data = f.read()

    # Load the geometry from WKB
    geom = wkb.loads(wkb_data)

    # Display information
    print(f"✅ Geometry Type: {geom.geom_type}")
    print(f"✅ Number of Polygons: {len(geom.geoms)}")
    print(f"✅ Total Area: {geom.area:.6f} square degrees")
    print(f"✅ Perimeter: {geom.length:.6f} degrees")
    print(f"✅ Bounding Box: {geom.bounds}")
    print(f"✅ Is Valid: {geom.is_valid}")
    print(f"✅ WKB Size: {len(wkb_data):,} bytes")

    # Show largest and smallest polygons
    areas = [poly.area for poly in geom.geoms]
    max_area_idx = areas.index(max(areas))
    min_area_idx = areas.index(min(areas))

    print(f"\n📊 Polygon Analysis:")
    print(f"   Largest polygon: {max(areas):.6f} sq degrees (#{max_area_idx + 1})")
    print(f"   Smallest polygon: {min(areas):.8f} sq degrees (#{min_area_idx + 1})")
    print(f"   Average polygon size: {sum(areas)/len(areas):.6f} sq degrees")

    # Show how to extract individual polygons
    print(f"\n🗺️  Sample polygon coordinates (first 3 points of largest polygon):")
    largest_poly = geom.geoms[max_area_idx]
    exterior_coords = list(largest_poly.exterior.coords)[:3]
    for i, (lon, lat) in enumerate(exterior_coords):
        print(f"   Point {i+1}: Longitude {lon:.6f}, Latitude {lat:.6f}")

    print(f"\n💡 PostgreSQL/PostGIS Usage:")
    print(f"   CREATE TABLE nsw_boundary (id SERIAL PRIMARY KEY, geom GEOMETRY(MULTIPOLYGON,4326));")
    print(f"   INSERT INTO nsw_boundary (geom) VALUES (ST_GeomFromWKB($1, 4326));")

if __name__ == '__main__':
    main()