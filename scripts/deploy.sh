#!/usr/bin/env bash

set -euo pipefail

cd /home/ec2-user/Market-Risk-Watcher

echo "Pulling latest code..."
git pull --ff-only

echo "Building and starting containers..."
docker compose up -d --build

echo "Checking containers..."
docker compose ps

echo "Waiting for API health..."

for i in {1..10}; do
    if curl -fsS http://127.0.0.1:8000/health; then
        echo
        echo "Deployment successful."
        exit 0
    fi

    echo "API not ready yet ($i/10). Retrying in 3 seconds..."
    sleep 3
done

echo "API failed to become healthy."
docker compose logs --tail=50 api
exit 1