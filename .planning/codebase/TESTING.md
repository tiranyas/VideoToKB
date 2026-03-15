# Testing

## Framework & Configuration

- **Framework:** Vitest 4.x
- **Environment:** Node (configured in `vitest.config.ts`)
- **Globals:** Enabled (`describe`, `it`, `expect` available without imports)
- **Path alias:** `@` → `./src`
- **Config file:** `vitest.config.ts`

## Test Structure

All tests live in `src/lib/__tests__/`, named `[module].test.ts`:

| Test File | Module Under Test |
|-----------|-------------------|
| `article-generator.test.ts` | `src/lib/article-generator.ts` |
| `loom-resolver.test.ts` | `src/lib/loom-resolver.ts` |
| `pipeline.test.ts` | `src/lib/pipeline.ts` |
| `transcription.test.ts` | `src/lib/transcription.ts` |

## Mocking Patterns

### SDK Mocking
```typescript
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({ /* mock methods */ }))
}));
```

### Internal Module Mocking
```typescript
vi.mock('@/lib/transcription', () => ({
  transcribeAudio: vi.fn()
}));
```

### Global Fetch Mocking
```typescript
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
```

### Reset Pattern
```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Assertion Style

- `expect.objectContaining({...})` for partial object matching
- `toMatch(/pattern/i)` for regex string matching
- Standard `toBe`, `toEqual`, `toHaveBeenCalledWith`

## Event Stream Testing

Pipeline tests collect SSE events:
```typescript
const events: any[] = [];
const stream = await runPipeline(url, (event) => events.push(event));
// Assert on collected events
```

## Coverage & Gaps

- **No coverage thresholds** configured
- **No integration tests** — all tests are unit tests with mocked dependencies
- **No E2E tests** — no Playwright/Cypress setup
- **Untested modules:**
  - All API routes (`src/app/api/`)
  - `gdrive-resolver.ts`
  - `youtube-resolver.ts`
  - `rate-limit.ts`
  - `word-export.ts`
  - All React components
  - Middleware

## Running Tests

```bash
npx vitest        # Watch mode
npx vitest run    # Single run
```
