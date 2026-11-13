@'
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

// Scenario: POST /transactions (the critical purchase endpoint).
// Ramp up to 20 virtual users, hold, then ramp down.
export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

// Runs once: creates one user and one product with plenty of stock.
export function setup() {
  const stamp = Date.now();
  const user = http.post(
    `${BASE_URL}/users`,
    JSON.stringify({ name: 'Load User', email: `load.${stamp}@test.com` }),
    JSON_HEADERS,
  );
  const product = http.post(
    `${BASE_URL}/products`,
    JSON.stringify({ name: `Load Product ${stamp}`, price: 10, quantity: 100000 }),
    JSON_HEADERS,
  );
  return { userId: user.json('data.id'), productId: product.json('data.id') };
}

// Runs repeatedly for every virtual user.
export default function (data) {
  const res = http.post(
    `${BASE_URL}/transactions`,
    JSON.stringify({ userId: data.userId, productId: data.productId, quantity: 1 }),
    JSON_HEADERS,
  );

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response has transaction id': (r) => r.json('data.id') !== undefined,
  });

  sleep(0.5);
}
'@ | Set-Content -Encoding utf8 qa\performance-test.js