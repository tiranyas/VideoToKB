# Requirements: KBPipe Stabilization

**Defined:** 2026-03-15
**Core Value:** Production reliability and code quality for a deployed SaaS

## v1 Requirements

Requirements for stabilization milestone. Each maps to roadmap phases.

### Security

- [ ] **SEC-01**: Rate limiter uses persistent storage that works across serverless instances
- [ ] **SEC-02**: SSRF protection blocks IPv6 private/loopback ranges in addition to IPv4

### Testing

- [x] **TEST-01**: Pipeline tests use the current function signature and pass
- [x] **TEST-02**: Article generator test asserts the correct model name (claude-sonnet-4-6)

### Performance

- [x] **PERF-01**: Dashboard stats are computed via DB aggregation query, not client-side JS
- [x] **PERF-02**: SSE parsing logic is extracted into a shared utility used by both components

## v2 Requirements

### Testing (Phase 11)

- [ ] **TEST-03**: Add test coverage for YouTube resolver (ID extraction, URL validation, fallback logic)
- [ ] **TEST-04**: Add test coverage for Google Drive resolver (URL parsing, download URL resolution)
- [ ] **TEST-05**: Add test coverage for API routes (/api/process auth/validation, /api/v1/generate auth/validation)
- [ ] **TEST-06**: API key utility functions (generateApiKey, hashApiKey, keyPrefix) have unit tests
- [ ] **E2E-01**: Playwright is installed and configured with webServer pointing to Next.js dev server
- [ ] **E2E-02**: Unauthenticated user is redirected to /login
- [ ] **E2E-03**: Login page renders correctly with email input and submit button
- [ ] **E2E-04**: Article list page renders for authenticated users (with mocked data)

### Code Quality

- **QUAL-01**: Extract duplicated admin Supabase singleton into shared module
- **QUAL-02**: Extract company context builder into shared function
- **QUAL-03**: Refactor settings page into smaller components

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe webhook handler | Stripe not connected yet |
| Structured logging | Nice to have but not blocking production |
| React exhaustive-deps fixes | Low risk, would touch many files |
| Anthropic client singleton | Marginal performance gain |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 6 | Pending |
| SEC-02 | Phase 6 | Pending |
| TEST-01 | Phase 6 | Complete |
| TEST-02 | Phase 6 | Complete |
| PERF-01 | Phase 7 | Complete |
| PERF-02 | Phase 7 | Complete |
| TEST-03 | Phase 11 | Pending |
| TEST-04 | Phase 11 | Pending |
| TEST-05 | Phase 11 | Pending |
| TEST-06 | Phase 11 | Pending |
| E2E-01 | Phase 11 | Pending |
| E2E-02 | Phase 11 | Pending |
| E2E-03 | Phase 11 | Pending |
| E2E-04 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 6 total
- v2 requirements (Phase 11): 8 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-19 — Phase 11 requirements added (TEST-03..06, E2E-01..04)*
