# Verification report

Verified locally on June 10, 2026 with Node.js `v20.20.2`, npm `10.8.2`, SQLite `3.51.0`, and Chromium `148.0.7778.96`.

## Acceptance criteria

| Requirement | Evidence | Result |
| --- | --- | --- |
| Realistic seeded clinic/support schema | `src/server/seed.ts` | Pass |
| Multiple deliberately broken scenarios | Five versioned scenario definitions | Pass |
| Documented SQL investigations | Five files under `docs/investigations/` | Pass |
| Safe repair scripts | Scoped transactions and expected-row checks | Pass |
| Verification queries | Scenario SQL and invariant implementation | Pass |
| Investigation dashboard/report generator | React workbench, timeline, Markdown report | Pass |
| Arbitrary SQL blocked | No general query route; API test confirms `404` | Pass |
| Every scenario repairable and verified | Unit test loops through all five scenarios | Pass |
| Responsive React UI | Desktop `1440x1000` and mobile `390x844` captures | Pass |
| CI, license, ignore rules, and operations docs | Repository artifacts | Pass |

## Exact command results

```text
$ npm run verify
lint: exit 0
typecheck: exit 0
Vitest: 2 files passed, 5 tests passed
Vite: 1,580 modules transformed
Web bundle: 201.54 kB JavaScript (63.61 kB gzip), 6.94 kB CSS (2.12 kB gzip)
API build: 21.82 kB ESM bundle with source map
Playwright: 1 Chromium workflow passed in 5.7s
overall exit: 0

$ npm audit --audit-level=moderate
found 0 vulnerabilities
```

Privacy and repository scans found:

- no private-key, platform-token, model-provider-key, or cloud-access-key patterns;
- no environment files, trace archives, HAR files, local-agent metadata, or other forbidden artifacts;
- no prohibited product branding, development-tooling attribution, or co-author terms.

The fixture values `synthetic_hash_not_a_password` and `synthetic_digest_not_a_secret` are explicit non-secret test markers. Investigation SQL never selects the hash or digest fields. `gitleaks` was not installed, so explicit high-signal credential patterns were used.

## Browser QA

Flow: reset lab → run duplicate-invoice investigation → inspect nine joined evidence rows → apply guarded repair → confirm post-repair invariants and report timeline.

- URL: `http://127.0.0.1:4473`
- Title: `Support SQL Lab`
- Meaningful scenario, editor, results, repair, verification, and timeline DOM confirmed.
- No framework error overlay.
- No browser console warnings or errors.
- Query confirmation: `Investigation returned 9 rows.`
- Repair confirmation: `Repair committed and verification passed.`
- Verification confirmed one active invoice, two void duplicates, and matching payment/invoice totals.

The in-app browser was used for DOM, console, and interaction verification. Repository Playwright generated reproducible committed screenshots.

## Visual fidelity ledger

| Comparison point | Concept | Implementation |
| --- | --- | --- |
| Navy scenario rail and white workbench | Strong technical console | Preserved |
| SQL editor and tabular results | Central investigation focus | Preserved |
| Hypothesis and repair panel | Always adjacent on desktop | Preserved |
| Amber repair and green verified states | Clear risk/status semantics | Preserved |
| Investigation timeline | Query, repair, verification evidence | Preserved |
| Mobile behavior | Stacked workbench with contained table scrolling | Preserved after overflow repair |

Above-the-fold copy matches the selected duplicate-invoice scenario. Intentional omissions are PDF generation and arbitrary editor execution; the Markdown report and allowlisted safety boundary are the implemented alternatives. No material visual mismatches remain.

## Residual risk

- Safari and Firefox were not exercised.
- SQLite transaction and locking behavior differs from PostgreSQL.
- Authentication, approvals, backups, and production credentials are intentionally absent.
