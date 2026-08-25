// Stress-tests the exact bug fixed this session (assertAttemptsAllowed /
// resume-on-start): fires N genuinely concurrent /start calls for the same
// user+quiz and checks every one succeeds and returns the SAME attemptId —
// a real race, not the sequential double-call the unit/integration tests use.
// A naive "check-then-create" implementation would either throw "Une tentative
// est déjà en cours" for the losers of the race, or (worse) create duplicate
// attempt rows if the check-then-insert weren't safely serialized.
//
// Run: node loadtest/quiz-start-concurrency.js
// Cleans up the attempt it creates via a direct DB delete (docker exec), so
// it's safe to run repeatedly against the demo dataset.
const { execSync } = require("child_process");
const { API_URL, login } = require("./_lib");

const EMAIL = "apprenant@iat-academy.local";
const PASSWORD = "Apprenant@123";
const QUIZ_ID = process.env.LOADTEST_QUIZ_ID || "c8b3f84b-9d7c-4fa8-8c01-7fadc49daa67"; // Quiz — Français pro
const CONCURRENCY = 20;

async function main() {
  console.log(`Logging in as ${EMAIL} ...`);
  const cookie = await login(EMAIL, PASSWORD);

  console.log(`Firing ${CONCURRENCY} concurrent /start calls for quiz ${QUIZ_ID} ...`);
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      fetch(`${API_URL}/api/quiz/${QUIZ_ID}/start`, {
        method: "POST",
        headers: { Cookie: `iat_token=${cookie}` },
      }).then(async (res) => ({ status: res.status, body: res.ok ? await res.json() : await res.text() }))
    )
  );

  const statuses = results.map((r) => r.status);
  const attemptIds = new Set(results.filter((r) => r.status === 200).map((r) => r.body.attemptId));

  console.log("Status codes:", statuses.join(", "));
  console.log(`Distinct attemptIds returned across ${CONCURRENCY} concurrent calls: ${attemptIds.size}`);

  let ok = true;
  if (statuses.some((s) => s !== 200)) {
    console.error(`FAIL: not every concurrent /start call succeeded (expected all 200, got: ${statuses.join(", ")}).`);
    ok = false;
  }
  if (attemptIds.size !== 1) {
    console.error(`FAIL: expected exactly 1 distinct attemptId across all concurrent calls, got ${attemptIds.size} — a real race created duplicate attempts.`);
    ok = false;
  }
  if (ok) {
    console.log("PASS: every concurrent /start call resumed the same single attempt — no duplicates, no false 'already in progress' errors.");
  }

  const attemptId = [...attemptIds][0];
  if (attemptId) {
    console.log(`Cleaning up test attempt ${attemptId} ...`);
    execSync(`docker exec iat-postgres psql -U iat -d iat_academy -c "delete from quiz_attempts where id='${attemptId}';"`, { stdio: "inherit" });
  }

  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
