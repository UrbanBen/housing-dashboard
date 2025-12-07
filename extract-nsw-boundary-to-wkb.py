#!/usr/bin/env python3
"""
Script to extract NSW boundary data from ABS ASGS2021 service
and convert it to WKB (Well-Known Binary) MULTIPOLYGON format.

This script replicates the data extraction used by the lga-insights card
in the housing insights dashboard.
"""

import requests
import json
from shapely.geometry import shape, MultiPolygon, Polygon
from shapely import wkb
import sys
import os

def fetch_nsw_boundary():
    """
    Fetch NSW boundary from ABS ASGS2021 service.
    This replicates the API call from LGAMap.tsx line 211-218.
    """
    print("Fetching NSW boundary from ABS ASGS2021 service...")

    # URL from the TypeScript code
    url = (
        'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/STE/MapServer/0/query?'
        'where=state_code_2021=%271%27&'
        'outFields=state_code_2021,state_name_2021,area_albers_sqkm&'
        'returnGeometry=true&'
        'f=geojson&'
        'outSR=4326'
    )

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        data = response.json()
        print(f"✅ Successfully fetched data from ABS")

        if 'features' in data and len(data['features']) > 0:
            nsw_feature = data['features'][0]
            print(f"✅ Found NSW feature: {nsw_feature['properties']['state_name_2021']}")
            return nsw_feature
        else:
            raise ValueError("No NSW features found in response")

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching from ABS: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON response: {e}")
        return None

def filter_mainland_polygons(geometry):
    """
    Filter NSW polygons to exclude remote islands.
    This replicates the filterMainlandPolygons function from LGAMap.tsx lines 22-68.
    """
    print("Filtering mainland polygons to exclude remote islands...")

    # NSW mainland bounds from TypeScript code
    mainland_bounds = {
        'north': -28.5,   # Northern border
        'south': -37.0,   # Southern border
        'west': 141.0,    # Western border
        'east': 153.0     # Eastern border (excludes Lord Howe Island at ~159°E)
    }

    if geometry['type'] != 'MultiPolygon':
        print("⚠️  Geometry is not MultiPolygon, returning as-is")
        return geometry

    filtered_coordinates = []
    excluded_count = 0

    for polygon_coords in geometry['coordinates']:
        if not polygon_coords or len(polygon_coords) == 0:
            continue

        # Check the first coordinate ring of each polygon
        first_ring = polygon_coords[0]
        if not first_ring or len(first_ring) == 0:
            continue

        # Calculate polygon bounds
        lngs = [coord[0] for coord in first_ring]
        lats = [coord[1] for coord in first_ring]

        min_lng = min(lngs)
        max_lng = max(lngs)
        min_lat = min(lats)
        max_lat = max(lats)

        # Check if polygon overlaps with mainland bounds
        overlaps_mainland = (
            min_lng < mainland_bounds['east'] and
            max_lng > mainland_bounds['west'] and
            min_lat < mainland_bounds['north'] and
            max_lat > mainland_bounds['south']
        )

        if overlaps_mainland:
            filtered_coordinates.append(polygon_coords)
        else:
            excluded_count += 1
            print(f"  ⚠️  Excluding remote polygon: bounds=({min_lat:.2f}, {min_lng:.2f}) to ({max_lat:.2f}, {max_lng:.2f})")

    print(f"✅ Filtered {excluded_count} remote polygons, kept {len(filtered_coordinates)} mainland polygons")

    return {
        'type': 'MultiPolygon',
        'coordinates': filtered_coordinates
    }

def convert_to_wkb(geojson_geometry, output_file):
    """
    Convert GeoJSON geometry to WKB format and save to file.
    """
    print("Converting geometry to WKB format...")

    try:
        # Create shapely geometry from GeoJSON
        geom = shape(geojson_geometry)

        # Ensure it's a MultiPolygon
        if isinstance(geom, Polygon):
            geom = MultiPolygon([geom])
        elif not isinstance(geom, MultiPolygon):
            raise ValueError(f"Expected Polygon or MultiPolygon, got {type(geom)}")

        print(f"✅ Created MultiPolygon with {len(geom.geoms)} polygons")
        print(f"   Total area: {geom.area:.6f} square degrees")
        print(f"   Bounds: {geom.bounds}")

        # Convert to WKB
        wkb_data = geom.wkb

        # Write to file
        with open(output_file, 'wb') as f:
            f.write(wkb_data)

        print(f"✅ WKB data written to: {output_file}")
        print(f"   File size: {len(wkb_data):,} bytes")

        return wkb_data

    except Exception as e:
        print(f"❌ Error converting to WKB: {e}")
        return None

def validate_wkb_file(wkb_file):
    """
    Validate the WKB file by reading it back and checking geometry.
    """
    print(f"Validating WKB file: {wkb_file}")

    try:
        with open(wkb_file, 'rb') as f:
            wkb_data = f.read()

        # Read back the WKB data
        geom = wkb.loads(wkb_data)

        print(f"✅ WKB file is valid!")
        print(f"   Geometry type: {geom.geom_type}")
        print(f"   Number of polygons: {len(geom.geoms) if hasattr(geom, 'geoms') else 1}")
        print(f"   Bounds: {geom.bounds}")
        print(f"   Is valid: {geom.is_valid}")

        return True

    except Exception as e:
        print(f"❌ WKB validation failed: {e}")
        return False

def create_geojson_backup(geojson_geometry, output_file):
    """
    Create a backup GeoJSON file for reference.
    """
    geojson_file = output_file.replace('.wkb', '.geojson')

    geojson_feature = {
        "type": "Feature",
        "properties": {
            "name": "New South Wales",
            "state_code": "1",
            "source": "ABS ASGS2021",
            "filtered": "mainland_only"
        },
        "geometry": geojson_geometry
    }

    with open(geojson_file, 'w') as f:
        json.dump(geojson_feature, f, indent=2)

    print(f"✅ GeoJSON backup created: {geojson_file}")

def main():
    """
    Main execution function.
    """
    print("🗺️  NSW Boundary WKB Extraction Tool")
    print("=" * 50)

    # Step 1: Fetch NSW boundary data
    nsw_feature = fetch_nsw_boundary()
    if not nsw_feature:
        print("❌ Failed to fetch NSW boundary data")
        sys.exit(1)

    # Step 2: Filter mainland polygons
    original_geometry = nsw_feature['geometry']
    filtered_geometry = filter_mainland_polygons(original_geometry)

    # Step 3: Generate output filename
    output_file = 'nsw_boundary_mainland.wkb'

    # Step 4: Convert to WKB
    wkb_data = convert_to_wkb(filtered_geometry, output_file)
    if not wkb_data:
        print("❌ Failed to convert to WKB")
        sys.exit(1)

    # Step 5: Validate WKB file
    if not validate_wkb_file(output_file):
        print("❌ WKB validation failed")
        sys.exit(1)

    # Step 6: Create GeoJSON backup
    create_geojson_backup(filtered_geometry, output_file)

    print("\n" + "=" * 50)
    print("✅ SUCCESS! NSW boundary extraction completed.")
    print(f"📁 WKB file: {os.path.abspath(output_file)}")
    print(f"📁 GeoJSON backup: {os.path.abspath(output_file.replace('.wkb', '.geojson'))}")
    print("\n💡 Usage:")
    print("  - Import WKB file into PostGIS: ST_GeomFromWKB()")
    print("  - Use in QGIS: Add Vector Layer")
    print("  - Python: shapely.wkb.loads()")

if __name__ == '__main__':
    # Check dependencies
    try:
        import shapely
        import requests
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("💡 Install with: pip install shapely requests")
        sys.exit(1)

    main()