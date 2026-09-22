# Market Risk Watcher

Market Risk Watcher is a cloud-deployed financial market monitoring API built with Python, FastAPI, PostgreSQL, Docker, AWS, and GitHub Actions.

The project collects market data from Yahoo Finance, stores historical prices in PostgreSQL, calculates risk metrics using SQL, and exposes the 
results through a REST API.

## Architecture

```text
Yahoo Finance
      |
      v
Market Data Updater
      |
      v
Amazon RDS PostgreSQL
      ^
      |
FastAPI
      |
Docker
      |
Amazon EC2
      ^
      |
GitHub Actions CI/CD

```
## Features
-Historical market price storage
-40 tracked financial assets
-Daily return calculations
-20-day moving averages
-20-day and 60-day volatility
-Bond ETF risk classification
-REST API built with FastAPI
-PostgreSQL database hosted on Amazon RDS
-Dockerized API deployment
-Automated testing with pytest
-GitHub Actions CI/CD
-Automatic EC2 deployment
-Scheduled market-data updates
-Kubernetes manifests for local orchestration experiments

## Technology Stack
-Python
-FastAPI
-PostgreSQL
-SQLAlchemy
-pandas
-yfinance
-Docker
-AWS EC2
-Amazon RDS
-GitHub Actions
-pytest
-Kubernetes
-kind

## API Endpoints 

| Method | Endpoint | Description |
| -------- | ------- | ------- |
| GET  | `/`   | API Status|
| GET | `/health` | Application and database health |
| GET    | `/version` | API version |
| GET| `/assets` | List tracked assets |
| GET | `/assets/{ticker}`| Risk information for an asset |
| GET |`/bonds` | Bond ETF risk summary |
| POST | `/update` | Download and store recent market data |

## DataBase 
Two PostgreSQL tables are used:
- `assets`
- `prices`
Risk analytics are exposed through the SQL view:`asset_risk_summary`
The view calculates metrics including:

- Daily returns
- 20-day moving average
- 20-day volatility
- 60-day volatility

## CI/CD
Every push to main triggers GitHub Actions
```text
git push
   |
   v
Run automated tests
   |
   v
Tests pass
   |
   v
EC2 self-hosted runner
   |
   v
Pull latest code
   |
   v
Build Docker image
   |
   v
Restart API
   |
   v
Health check

```
## Kubernetes
The `k8s/` directory contains Kubernetes manifests used for local learning, experimentation, and testing with kind. The production application currently runs on EC2 rather than Kubernetes.

The Kubernetes configuration demonstrates the following concepts:
      -Deployments
      -Pods
      -Services
      -ConfigMaps
      -Secrets
      -Readiness probes
      -Liveness probes
      -Resource requests and limits
      -Scaling
      -Rolling updates
      -Self-healing

## Security

Sensitive configuration such as database passwords is stored in environment variables and is not committed to Git.

The RDS PostgreSQL database is not publicly exposed and is accessed privately from the EC2 application server.