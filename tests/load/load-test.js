/**
 * k6 Load Test für aitema|Termin
 * k6 run tests/load/load-test.js --env BASE_URL=https://termin.yourdomain.de
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "1m", target: 30 },
    { duration: "3m", target: 150 },
    { duration: "5m", target: 150 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const rand = Math.random();
  
  if (rand < 0.5) {
    // Buchungsseite
    const res = http.get(`${BASE_URL}/buchen`);
    check(res, { "Buchungsseite 200": (r) => r.status === 200 });
    
  } else if (rand < 0.75) {
    // Freie Slots abrufen
    const res = http.get(`${BASE_URL}/api/slots?location_id=1&service_id=1`);
    check(res, { "Slots 200": (r) => r.status === 200 });
    
  } else if (rand < 0.9) {
    // Kiosk-Display (häufige Nutzung, da Refresh-Rate hoch)
    const res = http.get(`${BASE_URL}/display/kiosk`);
    check(res, { "Kiosk 200": (r) => r.status === 200 });
    
  } else {
    // Status-Seite
    const res = http.get(`${BASE_URL}/status`);
    check(res, { "Status 200": (r) => r.status === 200 });
  }
  
  sleep(Math.random() * 2 + 0.5);
}
