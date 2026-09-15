#!/usr/bin/env bash

set -euo pipefail

cd /home/ec2-user/Market-Risk-Watcher

echo "Pulling latest code..."
git pull --ff-only

echo "Building and starting containers..."
docker compose up -d --build

echo "Checking containers..."
docker compose ps

echo "Checking API health..."
curl -fsS http://127.0.0.1:8000/health

echo
echo "Deployment successful."