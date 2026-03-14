import type { SupabaseClient } from '@supabase/supabase-js';
import type { CompanyContext, ArticleType, PlatformProfile, Article } from '@/types';

// ── Company Context (per-user) ───────────────────────────

export async function getCompanyContext(
  supabase: SupabaseClient,
  userId: string
): Promise<CompanyContext | null> {
  const { data, error } = await supabase
    .from('company_contexts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    industry: data.industry ?? undefined,
    targetAudience: data.target_audience ?? undefined,
    createdAt: data.created_at,
  };
}

export async function upsertCompanyContext(
  supabase: SupabaseClient,
  userId: string,
  ctx: Omit<CompanyContext, 'id' | 'createdAt'>
): Promise<void> {
  const { error } = await supabase.from('company_contexts').upsert(
    {
      user_id: userId,
      name: ctx.name,
      description: ctx.description,
      industry: ctx.industry ?? null,
      target_audience: ctx.targetAudience ?? null,
    },
    { onConflict: 'user_id' }
  );

  if (error) throw new Error(`Failed to save company context: ${error.message}`);
}

export async function deleteCompanyContext(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('company_contexts')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete company context: ${error.message}`);
}

// ── Article Types (shared) ───────────────────────────────

export async function getArticleTypes(
  supabase: SupabaseClient
): Promise<ArticleType[]> {
  const { data, error } = await supabase
    .from('article_types')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load article types: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    draftPrompt: row.draft_prompt,
    structurePrompt: row.structure_prompt,
    isDefault: row.is_default,
  }));
}

export async function addArticleType(
  supabase: SupabaseClient,
  at: ArticleType
): Promise<void> {
  const { error } = await supabase.from('article_types').insert({
    id: at.id,
    name: at.name,
    draft_prompt: at.draftPrompt,
    structure_prompt: at.structurePrompt,
    is_default: at.isDefault ?? false,
  });

  if (error) throw new Error(`Failed to add article type: ${error.message}`);
}

export async function updateArticleType(
  supabase: SupabaseClient,
  id: string,
  at: Partial<ArticleType>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (at.name !== undefined) updates.name = at.name;
  if (at.draftPrompt !== undefined) updates.draft_prompt = at.draftPrompt;
  if (at.structurePrompt !== undefined) updates.structure_prompt = at.structurePrompt;

  const { error } = await supabase
    .from('article_types')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`Failed to update article type: ${error.message}`);
}

export async function deleteArticleType(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('article_types')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete article type: ${error.message}`);
}

// ── Platform Profiles (shared) ───────────────────────────

export async function getPlatformProfiles(
  supabase: SupabaseClient
): Promise<PlatformProfile[]> {
  const { data, error } = await supabase
    .from('platform_profiles')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load platform profiles: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    htmlPrompt: row.html_prompt,
    htmlTemplate: row.html_template,
    isDefault: row.is_default,
  }));
}

export async function addPlatformProfile(
  supabase: SupabaseClient,
  pp: PlatformProfile
): Promise<void> {
  const { error } = await supabase.from('platform_profiles').insert({
    id: pp.id,
    name: pp.name,
    html_prompt: pp.htmlPrompt,
    html_template: pp.htmlTemplate,
    is_default: pp.isDefault ?? false,
  });

  if (error) throw new Error(`Failed to add platform profile: ${error.message}`);
}

export async function updatePlatformProfile(
  supabase: SupabaseClient,
  id: string,
  pp: Partial<PlatformProfile>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (pp.name !== undefined) updates.name = pp.name;
  if (pp.htmlPrompt !== undefined) updates.html_prompt = pp.htmlPrompt;
  if (pp.htmlTemplate !== undefined) updates.html_template = pp.htmlTemplate;

  const { error } = await supabase
    .from('platform_profiles')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(`Failed to update platform profile: ${error.message}`);
}

export async function deletePlatformProfile(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('platform_profiles')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete platform profile: ${error.message}`);
}

// ── User Preferences (per-user) ──────────────────────────

export interface UserPreferences {
  selectedArticleTypeId: string | null;
  selectedPlatformId: string | null;
}

export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences> {
  const { data } = await supabase
    .from('user_preferences')
    .select('selected_article_type_id, selected_platform_id')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    selectedArticleTypeId: data?.selected_article_type_id ?? null,
    selectedPlatformId: data?.selected_platform_id ?? null,
  };
}

export async function upsertUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: Partial<UserPreferences>
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId };
  if (prefs.selectedArticleTypeId !== undefined)
    row.selected_article_type_id = prefs.selectedArticleTypeId;
  if (prefs.selectedPlatformId !== undefined)
    row.selected_platform_id = prefs.selectedPlatformId;

  const { error } = await supabase
    .from('user_preferences')
    .upsert(row, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to save preferences: ${error.message}`);
}

// ── Articles (per-user) ──────────────────────────────────

export async function saveArticle(
  supabase: SupabaseClient,
  userId: string,
  article: Omit<Article, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      title: article.title,
      source_url: article.sourceUrl ?? null,
      source_type: article.sourceType,
      article_type_id: article.articleTypeId ?? null,
      platform_id: article.platformId ?? null,
      markdown: article.markdown,
      html: article.html ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save article: ${error.message}`);
  return data.id;
}

export async function updateArticleTitle(
  supabase: SupabaseClient,
  articleId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ title })
    .eq('id', articleId);

  if (error) throw new Error(`Failed to update article title: ${error.message}`);
}

export async function updateArticleHtml(
  supabase: SupabaseClient,
  articleId: string,
  html: string
): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ html })
    .eq('id', articleId);

  if (error) throw new Error(`Failed to update article HTML: ${error.message}`);
}

export async function getArticles(
  supabase: SupabaseClient,
  userId: string
): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, article_types(name), platform_profiles(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load articles: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    sourceUrl: row.source_url ?? undefined,
    sourceType: row.source_type,
    articleTypeId: row.article_type_id ?? undefined,
    platformId: row.platform_id ?? undefined,
    articleTypeName: row.article_types?.name,
    platformName: row.platform_profiles?.name,
    markdown: row.markdown,
    html: row.html ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function getArticle(
  supabase: SupabaseClient,
  articleId: string
): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    sourceUrl: data.source_url ?? undefined,
    sourceType: data.source_type,
    articleTypeId: data.article_type_id ?? undefined,
    platformId: data.platform_id ?? undefined,
    markdown: data.markdown,
    html: data.html ?? undefined,
    createdAt: data.created_at,
  };
}

export async function deleteArticle(
  supabase: SupabaseClient,
  articleId: string
): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId);

  if (error) throw new Error(`Failed to delete article: ${error.message}`);
}
