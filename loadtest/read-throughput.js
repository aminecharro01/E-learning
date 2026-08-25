// Baseline throughput/latency for a typical authenticated read (GET /api/auth/me
// — every page load hits something like this). Fires REQUESTS total requests with
// CONCURRENCY in flight at a time and reports req/s + latency percentiles, so a
// future change can be compared against this baseline instead of guessing.
//
// Run: node loadtest/read-throughput.js
const { login, runLoad, summarize, API_URL } = require("./_lib");

const EMAIL = "apprenant@iat-academy.local";
const PASSWORD = "Apprenant@123";
const REQUESTS = Number(process.env.LOADTEST_REQUESTS || 300);
const CONCURRENCY = Number(process.env.LOADTEST_CONCURRENCY || 20);

async function main() {
  console.log(`Logging in as ${EMAIL} ...`);
  const cookie = await login(EMAIL, PASSWORD);

  console.log(`Firing ${REQUESTS} GET /api/auth/me requests, ${CONCURRENCY} at a time, against ${API_URL} ...`);
  const start = performance.now();
  const { durations, statusCounts } = await runLoad(REQUESTS, CONCURRENCY, async () => {
    const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Cookie: `iat_token=${cookie}` } });
    await res.text();
    return res.status;
  });
  const totalSeconds = (performance.now() - start) / 1000;

  summarize("GET /api/auth/me", durations, statusCounts);
  console.log(`throughput: ${(REQUESTS / totalSeconds).toFixed(1)} req/s over ${totalSeconds.toFixed(2)}s wall time`);

  const errorCount = Object.entries(statusCounts)
    .filter(([status]) => status === "ERROR" || Number(status) >= 500)
    .reduce((sum, [, count]) => sum + count, 0);
  if (errorCount > 0) {
    console.error(`FAIL: ${errorCount} request(s) errored or returned 5xx under load.`);
    process.exitCode = 1;
  } else {
    console.log("PASS: no errors or 5xx responses under load.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
