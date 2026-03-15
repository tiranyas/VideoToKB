# KBify

## What This Is

KBify is a SaaS that converts video recordings (Loom, YouTube, Google Drive) into structured knowledge base articles. Users paste a video URL, select an article type and platform profile, and receive a formatted article ready for publishing. Built with Next.js on Vercel, Supabase for auth/data, and Claude for AI-powered article generation.

## Core Value

A user can take a video recording and get back a publish-ready KB article in minutes instead of days — the tool is a content pipeline, not a KB replacement.

## Requirements

### Validated

- ✓ User can paste a Loom, YouTube, or Google Drive video URL and submit it for processing — existing
- ✓ User can select an article type with custom prompts — existing
- ✓ System transcribes video via AssemblyAI (Loom/GDrive) or InnerTube/Supadata (YouTube) — existing
- ✓ System generates structured KB article via Claude API (claude-sonnet-4-6) with multi-agent pipeline — existing
- ✓ User sees step-by-step SSE progress during processing — existing
- ✓ User can view and inline-edit the generated article — existing
- ✓ User can generate platform-specific HTML from article — existing
- ✓ User can export article as Word document — existing
- ✓ Authentication via Supabase (magic link + Google OAuth) — existing
- ✓ Multi-workspace support with workspace switching — existing
- ✓ Dashboard with article stats and workspace overview — existing
- ✓ API key management for public REST API (`/api/v1/generate`) — existing
- ✓ MCP server for AI assistant integration — existing
- ✓ Rate limiting on API endpoints — existing (in-memory, needs upgrade)
- ✓ Quota/subscription enforcement — existing
- ✓ Settings page with article types, platform profiles, company context — existing
- ✓ Cookie consent and privacy/terms pages — existing

### Active

- [ ] Move rate limiter from in-memory to persistent storage (Upstash Redis or Supabase)
- [ ] Fix broken pipeline tests (function signature mismatch)
- [ ] Fix article-generator test (wrong model name assertion)
- [ ] Complete SSRF protection (block IPv6 private ranges in URL validation)
- [ ] Move dashboard aggregation from client-side JS to DB-level queries
- [ ] Extract shared SSE parsing logic from duplicated components

### Out of Scope

- Stripe webhook handler — Stripe is not connected to anything yet
- Direct KB API integrations (Helpjuice, Zendesk) — v2
- Chrome Extension — v2
- Video file upload (only URLs for now)
- Mobile app — web-first

## Context

- **POC validated:** Head of Ops at FinBot built a manual pipeline that produced 200+ articles, saving 100K+ NIS/year
- **Target audience:** Head of Support / Head of Operations at Israeli B2B SaaS companies (20-150 employees)
- **Pain point:** Backlog of training/product update recordings that nobody converts to written documentation
- **Product is deployed and running in production on Vercel**
- **Solo developer actively building and iterating**
- **Pricing model (future):** Credit-based, pay-per-use — ~$0.15 production cost per article, ~90% gross margin

## Constraints

- **Tech stack:** Next.js 16 + React 19, Vercel, Supabase (PostgreSQL + Auth), AssemblyAI, Claude API (claude-sonnet-4-6)
- **Deployment:** Vercel with serverless functions (max 300s for pipeline routes)
- **Rate limiting:** Current in-memory approach is ineffective in serverless — must use persistent store
- **Language:** PRD is in Hebrew but product UI is in English

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pipeline tool, not KB replacement | Users already have KB platforms — meet them where they are | ✓ Good |
| Multi-agent pipeline (3 Claude calls) | Each agent has focused role: draft → structure → HTML | ✓ Good |
| SSE streaming for progress | ~3 min wait needs user confidence the pipeline is working | ✓ Good |
| Supabase for auth + data | Integrated auth/DB, RLS for multi-tenancy | ✓ Good |
| In-memory rate limiter | Quick MVP solution | ⚠️ Revisit — useless in serverless |
| No structured logging | Quick MVP | ⚠️ Revisit — hard to debug production issues |

---
*Last updated: 2026-03-15 after stabilization milestone planning*
