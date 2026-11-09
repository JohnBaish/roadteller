#!/usr/bin/env bash
# Download the sources into $1 (see build/README.md). Year of DfT's latest Major
# Roads Database in $2 (e.g. 2025).
set -euo pipefail
DL="$1"; MRDB="$2"
mkdir -p "$DL" && cd "$DL"
S19=https://data.dft.gov.uk/road-accidents-safety-data
curl -fsSL -o collision-all.csv "$S19/dft-road-casualty-statistics-collision-1979-latest-published-year.csv"
curl -fsSL -o collision.csv "$S19/dft-road-casualty-statistics-collision-last-5-years.csv"
curl -fsSL -o casualty.csv "$S19/dft-road-casualty-statistics-casualty-last-5-years.csv"
RT=https://storage.googleapis.com/dft-statistics/road-traffic
curl -fsSL -o aadf.zip "$RT/downloads/data-gov-uk/dft_traffic_counts_aadf.zip"
mkdir -p aadf && unzip -q -o -j aadf.zip -d aadf && rm aadf.zip
curl -fsSL -o local_authority_traffic.csv "$RT/downloads/data-gov-uk/local_authority_traffic.csv"
curl -fsSL -o region_traffic_by_road_type.csv "$RT/downloads/data-gov-uk/region_traffic_by_road_type.csv"
curl -fsSL -o mrdb.zip "$RT/mrdb-$MRDB.zip"
mkdir -p mrdb && unzip -q -o -j mrdb.zip -d mrdb && rm mrdb.zip
OS=https://api.os.uk/downloads/v1/products
curl -fsSL -o openroads.zip "$OS/OpenRoads/downloads?area=GB&format=ESRI%C2%AE+Shapefile&redirect"
mkdir -p or-all && (cd or-all && unzip -q -o ../openroads.zip 'data/*_RoadLink.*') && rm openroads.zip
curl -fsSL -o bdline.zip "$OS/BoundaryLine/downloads?area=GB&format=ESRI%C2%AE+Shapefile&redirect"
mkdir -p bl && (cd bl && unzip -q -o ../bdline.zip 'Data/GB/county_region.*' 'Data/GB/district_borough_unitary_region.*' 'Data/GB/english_region_region.*') && rm bdline.zip
ls -la
