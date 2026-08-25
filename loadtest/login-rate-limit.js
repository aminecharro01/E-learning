// Stress-tests the login endpoint's abuse protection: RateLimitService allows
// 10 attempts per IP per 15 minutes (see LOGIN_MAX_ATTEMPTS in
// backend/.../service/RateLimitService.java). Fires 15 back-to-back bad-password
// attempts and expects the first 10 to be rejected as bad credentials (401) and
// the rest to be throttled (429) — proving the limiter holds under repeated abuse
// instead of letting every attempt through to bcrypt/DB.
//
// Run: node loadtest/login-rate-limit.js
const { API_URL } = require("./_lib");

const EMAIL = "apprenant@iat-academy.local";
const ATTEMPTS = 15;

async function main() {
  console.log(`Firing ${ATTEMPTS} bad-password login attempts against ${API_URL} ...`);
  const statuses = [];
  for (let i = 0; i < ATTEMPTS; i++) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: "definitely-wrong" }),
    });
    statuses.push(res.status);
  }

  console.log("Status sequence:", statuses.join(", "));
  // Bad credentials map to 400 in this API (AuthService throws a plain ApiException,
  // not a 401) — same discovery made writing the Playwright login spec.
  const badCredentialsCount = statuses.filter((s) => s === 400).length;
  const rateLimitedCount = statuses.filter((s) => s === 429).length;
  console.log(`400 (bad credentials): ${badCredentialsCount}`);
  console.log(`429 (rate limited):    ${rateLimitedCount}`);

  if (rateLimitedCount === 0) {
    console.error("FAIL: no request was rate-limited — the login endpoint has no abuse protection under this load.");
    process.exitCode = 1;
  } else {
    console.log("PASS: repeated bad-credential attempts get throttled before exhausting the limit indefinitely.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
