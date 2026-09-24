#!/usr/bin/env bash

set -euo pipefail

cd /home/ec2-user/Market-Risk-Watcher

echo "Starting market data update: $(date)"

UPDATE_API_KEY=$(
    grep '^UPDATE_API_KEY=' .env |
    cut -d= -f2-
)

if [ -z "$UPDATE_API_KEY" ]; then
    echo "UPDATE_API_KEY is not configured."
    exit 1
fi

curl -fsS \
    -X POST \
    -H "X-API-Key: ${UPDATE_API_KEY}" \
    http://127.0.0.1:8000/update

echo
echo "Finished market data update: $(date)"