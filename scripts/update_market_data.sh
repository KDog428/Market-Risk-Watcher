#!/usr/bin/env bash

set -e

echo "Starting market data update: $(date)"

curl -fsS \
    -X POST \
    http://127.0.0.1:8000/update

echo
echo "Finished market data update: $(date)"
