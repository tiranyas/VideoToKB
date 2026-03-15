# Requirements: KBify Stabilization

**Defined:** 2026-03-15
**Core Value:** Production reliability and code quality for a deployed SaaS

## v1 Requirements

Requirements for stabilization milestone. Each maps to roadmap phases.

### Security

- [ ] **SEC-01**: Rate limiter uses persistent storage that works across serverless instances
- [ ] **SEC-02**: SSRF protection blocks IPv6 private/loopback ranges in addition to IPv4

### Testing

- [ ] **TEST-01**: Pipeline tests use the current function signature and pass
- [ ] **TEST-02**: Article generator test asserts the correct model name (claude-sonnet-4-6)

### Performance

- [ ] **PERF-01**: Dashboard stats are computed via DB aggregation query, not client-side JS
- [ ] **PERF-02**: SSE parsing logic is extracted into a shared utility used by both components

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Testing

- **TEST-03**: Add test coverage for YouTube resolver
- **TEST-04**: Add test coverage for Google Drive resolver
- **TEST-05**: Add test coverage for API routes

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
| TEST-01 | Phase 6 | Pending |
| TEST-02 | Phase 6 | Pending |
| PERF-01 | Phase 7 | Pending |
| PERF-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 — traceability complete (Phase 6: SEC-01, SEC-02, TEST-01, TEST-02; Phase 7: PERF-01, PERF-02)*
