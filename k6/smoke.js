import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const baseUrl = __ENV.API_BASE_URL || 'http://localhost:8000';
const errors = new Rate('business_errors');
const latency = new Trend('api_latency_ms');

export const options = {
  vus: Number(__ENV.K6_VUS || 5),
  duration: __ENV.K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
    business_errors: ['rate<0.01'],
  },
};

export default function () {
  const assetId = encodeURIComponent(__ENV.ASSET_ID || 'AV-GPA-01');
  const endpoints = [
    `/api/v1/health`,
    `/api/v1/assets/${assetId}/telemetry`,
    `/api/v1/assets/${assetId}/forecast?horizon=1D`,
    `/api/v1/assets/${assetId}/work-orders`,
  ];

  for (const path of endpoints) {
    const response = http.get(`${baseUrl}${path}`, { tags: { endpoint: path } });
    latency.add(response.timings.duration);
    const ok = check(response, {
      [`${path} responds successfully`]: (r) => r.status >= 200 && r.status < 300,
      [`${path} has content type`]: (r) => Boolean(r.headers['Content-Type']),
    });
    errors.add(!ok);
  }
  sleep(1);
}
