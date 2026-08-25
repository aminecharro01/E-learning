// Shared helpers for the load-test scripts in this folder. Plain Node (global
// fetch, no dependencies) so `node loadtest/<script>.js` works with nothing
// to install.

const API_URL = process.env.LOADTEST_API_URL || "http://localhost:8091";

function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return 0;
  const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[idx];
}

function summarize(label, durationsMs, statusCounts) {
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const total = durationsMs.length;
  const avg = total ? durationsMs.reduce((a, b) => a + b, 0) / total : 0;
  console.log(`\n=== ${label} ===`);
  console.log(`requests: ${total}`);
  console.log(`status codes: ${JSON.stringify(statusCounts)}`);
  console.log(`latency ms — min:${sorted[0]?.toFixed(1) ?? 0} avg:${avg.toFixed(1)} p50:${percentile(sorted, 50).toFixed(1)} p95:${percentile(sorted, 95).toFixed(1)} p99:${percentile(sorted, 99).toFixed(1)} max:${sorted[total - 1]?.toFixed(1) ?? 0}`);
}

/** Logs in once and returns the iat_token cookie value (raises if login fails). */
async function login(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/iat_token=([^;]+)/);
  if (!match) throw new Error("no iat_token cookie in login response");
  return match[1];
}

/** Fires `count` requests with `concurrency` in flight at a time, timing each one. */
async function runLoad(count, concurrency, requestFn) {
  const durations = [];
  const statusCounts = {};
  let index = 0;

  async function worker() {
    while (index < count) {
      const i = index++;
      const start = performance.now();
      try {
        const status = await requestFn(i);
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      } catch (err) {
        statusCounts["ERROR"] = (statusCounts["ERROR"] || 0) + 1;
      }
      durations.push(performance.now() - start);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return { durations, statusCounts };
}

module.exports = { API_URL, summarize, login, runLoad };
