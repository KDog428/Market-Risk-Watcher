# Market Risk Watcher

Market Risk Watcher is a full-stack market analytics platform for exploring
stocks, ETFs, bond funds, and market indices.

The application collects market data, stores it in PostgreSQL, calculates
risk metrics, exposes the data through a FastAPI API, and provides an
interactive web dashboard for asset analysis and comparison.

## Live Demo

https://kdog428.github.io/Market-Risk-Watcher/

## Architecture

```text
GitHub Pages
     |
     | HTTPS
     v
DuckDNS Domain
     |
     v
Caddy Reverse Proxy
     |
     v
FastAPI on AWS EC2
     |
     v
Amazon RDS PostgreSQL
     ^
     |
Yahoo Finance Updater

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
**Frontend**
- HTML
- CSS
- JavaScript
- Chart.js
- GitHub Pages

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pandas
- yfinance

**Database**
- PostgreSQL
- Amazon RDS

**Infrastructure**
- AWS EC2
- Docker
- Docker Compose
- Caddy
- DuckDNS
- systemd
- Kubernetes / kind for local orchestration learning

**CI/CD**
- GitHub Actions
- Self-hosted EC2 runner
- Automated tests and deployment
  **Database**
- PostgreSQL
- Amazon RDS

**Infrastructure**
- AWS EC2
- Docker
- Docker Compose
- Caddy
- DuckDNS
- systemd
- Kubernetes / kind for local orchestration learning

**CI/CD**
- GitHub Actions
- Self-hosted EC2 runner
- Automated tests and deployment
  
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
- Production PostgreSQL runs privately in Amazon RDS
- FastAPI is exposed through an HTTPS reverse proxy
- Direct public access to the application container is restricted
- The market update endpoint requires an API key
- Secrets are stored in environment variables and excluded from Git
- GitHub Pages is allowed through a restricted CORS configuration
