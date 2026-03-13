import type { CompanyContext, ArticleType, PlatformProfile } from '@/types';
import { DEFAULT_ARTICLE_TYPES } from '@/lib/templates/agent2-draft';
import { DEFAULT_PLATFORM_PROFILES } from '@/lib/templates/agent4-html';

const KEYS = {
  companyContext: 'videotokb_company_context',
  articleTypes: 'videotokb_article_types',
  platformProfiles: 'videotokb_platform_profiles',
  selectedArticleType: 'videotokb_selected_article_type',
  selectedPlatform: 'videotokb_selected_platform',
  seeded: 'videotokb_seeded',
} as const;

// ── Helpers ──────────────────────────────────────────────

function get<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Company Context ──────────────────────────────────────

export function getCompanyContext(): CompanyContext | null {
  return get<CompanyContext>(KEYS.companyContext);
}

export function saveCompanyContext(ctx: CompanyContext): void {
  set(KEYS.companyContext, ctx);
}

export function deleteCompanyContext(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.companyContext);
}

// ── Article Types ────────────────────────────────────────

export function getArticleTypes(): ArticleType[] {
  return get<ArticleType[]>(KEYS.articleTypes) ?? [];
}

export function saveArticleTypes(types: ArticleType[]): void {
  set(KEYS.articleTypes, types);
}

export function addArticleType(type: ArticleType): void {
  const current = getArticleTypes();
  current.push(type);
  saveArticleTypes(current);
}

export function updateArticleType(id: string, updated: Partial<ArticleType>): void {
  const current = getArticleTypes();
  const idx = current.findIndex((t) => t.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...updated };
    saveArticleTypes(current);
  }
}

export function deleteArticleType(id: string): void {
  saveArticleTypes(getArticleTypes().filter((t) => t.id !== id));
}

// ── Platform Profiles ────────────────────────────────────

export function getPlatformProfiles(): PlatformProfile[] {
  return get<PlatformProfile[]>(KEYS.platformProfiles) ?? [];
}

export function savePlatformProfiles(profiles: PlatformProfile[]): void {
  set(KEYS.platformProfiles, profiles);
}

export function addPlatformProfile(profile: PlatformProfile): void {
  const current = getPlatformProfiles();
  current.push(profile);
  savePlatformProfiles(current);
}

export function updatePlatformProfile(id: string, updated: Partial<PlatformProfile>): void {
  const current = getPlatformProfiles();
  const idx = current.findIndex((p) => p.id === id);
  if (idx >= 0) {
    current[idx] = { ...current[idx], ...updated };
    savePlatformProfiles(current);
  }
}

export function deletePlatformProfile(id: string): void {
  savePlatformProfiles(getPlatformProfiles().filter((p) => p.id !== id));
}

// ── Selected IDs ─────────────────────────────────────────

export function getSelectedArticleTypeId(): string | null {
  return get<string>(KEYS.selectedArticleType);
}

export function setSelectedArticleTypeId(id: string): void {
  set(KEYS.selectedArticleType, id);
}

export function getSelectedPlatformId(): string | null {
  return get<string>(KEYS.selectedPlatform);
}

export function setSelectedPlatformId(id: string): void {
  set(KEYS.selectedPlatform, id);
}

// ── Seed Defaults ────────────────────────────────────────

export function seedDefaults(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(KEYS.seeded)) return;

  // Seed article types
  if (getArticleTypes().length === 0) {
    saveArticleTypes(DEFAULT_ARTICLE_TYPES);
    setSelectedArticleTypeId(DEFAULT_ARTICLE_TYPES[0].id);
  }

  // Seed platform profiles
  if (getPlatformProfiles().length === 0) {
    savePlatformProfiles(DEFAULT_PLATFORM_PROFILES);
    setSelectedPlatformId(DEFAULT_PLATFORM_PROFILES[0].id);
  }

  localStorage.setItem(KEYS.seeded, 'true');
}
