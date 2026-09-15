CREATE OR REPLACE VIEW asset_risk_summary AS
 WITH calculations AS (
         SELECT p.asset_id,
            a.ticker,
            a.company_name,
            a.asset_type,
            p.date,
            p.close,
            p.close / lag(p.close) OVER (PARTITION BY p.asset_id ORDER BY p.date) - 1::numeric AS daily_return,
            avg(p.close) OVER (PARTITION BY p.asset_id ORDER BY p.date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS moving_avg_20d
           FROM prices p
             JOIN assets a ON p.asset_id = a.asset_id
        ), risk_metrics AS (
         SELECT calculations.asset_id,
            calculations.ticker,
            calculations.company_name,
            calculations.asset_type,
            calculations.date,
            calculations.close,
            calculations.daily_return,
            calculations.moving_avg_20d,
            stddev_samp(calculations.daily_return) OVER (PARTITION BY calculations.asset_id ORDER BY calculations.date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS volatility_20d,
            stddev_samp(calculations.daily_return) OVER (PARTITION BY calculations.asset_id ORDER BY calculations.date ROWS BETWEEN 59 PRECEDING AND CURRENT ROW) AS volatility_60d
           FROM calculations
        ), latest_rows AS (
         SELECT risk_metrics.asset_id,
            risk_metrics.ticker,
            risk_metrics.company_name,
            risk_metrics.asset_type,
            risk_metrics.date,
            risk_metrics.close,
            risk_metrics.daily_return,
            risk_metrics.moving_avg_20d,
            risk_metrics.volatility_20d,
            risk_metrics.volatility_60d,
            row_number() OVER (PARTITION BY risk_metrics.asset_id ORDER BY risk_metrics.date DESC) AS row_number
           FROM risk_metrics
        )
 SELECT asset_id,
    ticker,
    company_name,
    asset_type,
    date,
    close,
    round(daily_return * 100::numeric, 2) AS daily_return_pct,
    round(moving_avg_20d, 2) AS moving_avg_20d,
    round(volatility_20d * sqrt(252::numeric) * 100::numeric, 2) AS volatility_20d_pct,
    round(volatility_60d * sqrt(252::numeric) * 100::numeric, 2) AS volatility_60d_pct
   FROM latest_rows
  WHERE row_number = 1;;
