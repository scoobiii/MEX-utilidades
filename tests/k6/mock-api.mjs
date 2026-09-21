import express from 'express';

const app = express();
const port = Number(process.env.PORT || 8000);

app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/v1/assets/:assetId/telemetry', (req, res) => res.json({
  assetId: req.params.assetId,
  provenance: 'OBSERVED',
  telemetry: { returnTemperatureC: 24, evaporatorTemperatureC: 12, currentA: 7.1, voltageV: 220 },
}));
app.get('/api/v1/assets/:assetId/forecast', (req, res) => res.json({
  assetId: req.params.assetId,
  horizon: req.query.horizon || '1D',
  source: 'DEMO_SYNTHETIC',
  provenance: 'INFERRED',
}));
app.get('/api/v1/assets/:assetId/work-orders', (req, res) => res.json({
  assetId: req.params.assetId,
  items: [],
}));

app.listen(port, '127.0.0.1', () => {
  console.log(`MEX API contract stub listening on http://127.0.0.1:${port}`);
});
