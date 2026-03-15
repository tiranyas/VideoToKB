import type { SupabaseClient } from '@supabase/supabase-js';
import type { Workspace, ArticleType, PlatformProfile, Article, Plan, Subscription, UserUsage, PlanId } from '@/types';

// ── Workspaces ──────────────────────────────────────────

export async function getWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load workspaces: ${error.message}`);

  return (data ?? []).map(mapWorkspaceRow);
}

export async function getWorkspace(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return mapWorkspaceRow(data);
}

export async function createWorkspace(
  supabase: SupabaseClient,
  userId: string,
  ws: { name: string; slug: string; companyName?: string; companyDescription?: string; industry?: string; targetAudience?: string }
): Promise<string> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      user_id: userId,
      name: ws.name,
      slug: ws.slug,
      company_name: ws.companyName ?? null,
      company_description: ws.companyDescription ?? null,
      industry: ws.industry ?? null,
      target_audience: ws.targetAudience ?? null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create workspace: ${error.message}`);
  return data.id;
}

export async function updateWorkspace(
  supabase: SupabaseClient,
  workspaceId: string,
  ws: Partial<{ name: string; slug: string; companyName: string; companyDescription: string; industry: string; targetAudience: string }>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (ws.name !== undefined) updates.name = ws.name;
  if (ws.slug !== undefined) updates.slug = ws.slug;
  if (ws.companyName !== undefined) updates.company_name = ws.companyName;
  if (ws.companyDescription !== undefined) updates.company_description = ws.companyDescription;
  if (ws.industry !== undefined) updates.industry = ws.industry;
  if (ws.targetAudience !== undefined) updates.target_audience = ws.targetAudience;

  const { error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId);

  if (error) throw new Error(`Failed to update workspace: ${error.message}`);
}

export async function deleteWorkspace(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId);

  if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
}

function mapWorkspaceRow(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    slug: row.slug as string,
    companyName: (row.company_name as string) ?? undefined,
    companyDescription: (row.company_description as string) ?? undefined,
    industry: (row.industry as string) ?? undefined,
    targetAudience: (row.target_audience as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Active Workspace (user_settings) ────────────────────

export async function getActiveWorkspaceId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('active_workspace_id')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.active_workspace_id ?? null;
}

export async function setActiveWorkspaceId(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, active_workspace_id: workspaceId },
      { onConflict: 'user_id' }
    );

  if (error) throw new Error(`Failed to set active workspace: ${error.message}`);
}

// ── Workspace Preferences (per-workspace) ───────────────

export interface WorkspacePreferences {
  selectedArticleTypeId: string | null;
  selectedPlatformId: string | null;
}

export async function getWorkspacePreferences(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspacePreferences> {
  const { data } = await supabase
    .from('workspace_preferences')
    .select('selected_article_type_id, selected_platform_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return {
    selectedArticleTypeId: data?.selected_article_type_id ?? null,
    selectedPlatformId: data?.selected_platform_id ?? null,
  };
}

export async function upsertWorkspacePreferences(
  supabase: SupabaseClient,
  workspaceId: string,
  prefs: Partial<WorkspacePreferences>
): Promise<void> {
  const row: Record<string, unknown> = { workspace_id: workspaceId };
  if (prefs.selectedArticleTypeId !== undefined)
    row.selected_article_type_id = prefs.selectedArticleTypeId;
  if (prefs.selectedPlatformId !== undefined)
    row.selected_platform_id = prefs.selectedPlatformId;

  const { error } = await supabase
    .from('workspace_preferences')
    .upsert(row, { onConflict: 'workspace_id' });

  if (error) throw new Error(`Failed to save workspace preferences: ${error.message}`);
}

// ── Plans & Subscriptions ────────────────────────────────

export async function getPlans(
  supabase: SupabaseClient
): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to load plans: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as PlanId,
    name: row.name,
    priceCents: row.price_cents,
    articleLimit: row.article_limit,
    description: row.description ?? undefined,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    planId: data.plan_id as PlanId,
    status: data.status,
    bonusCredits: data.bonus_credits,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    stripeSubscriptionId: data.stripe_subscription_id ?? undefined,
    stripeCustomerId: data.stripe_customer_id ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function ensureSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription> {
  let sub = await getUserSubscription(supabase, userId);
  if (sub) return sub;

  // Auto-create free subscription
  const { error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: 'free',
      status: 'active',
    });

  if (error) throw new Error(`Failed to create subscription: ${error.message}`);

  sub = await getUserSubscription(supabase, userId);
  if (!sub) throw new Error('Failed to retrieve created subscription');
  return sub;
}

export async function getUserUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UserUsage | null> {
  const { data, error } = await supabase
    .rpc('get_user_usage', { p_user_id: userId });

  if (error) throw new Error(`Failed to get usage: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    articlesThisPeriod: Number(row.articles_this_period),
    articleLimit: row.article_limit,
    bonusCredits: row.bonus_credits,
    articlesRemaining: row.articles_remaining,
    planId: row.plan_id as PlanId,
    planName: row.plan_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

export async function checkQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; usage: UserUsage | null; message?: string }> {
  // Ensure user has a subscription (auto-create free if not)
  await ensureSubscription(supabase, userId);

  // Check if billing period needs reset
  const sub = await getUserSubscription(supabase, userId);
  if (sub && new Date(sub.currentPeriodEnd) <= new Date()) {
    // Reset the period
    await supabase
      .from('subscriptions')
      .update({
        current_period_start: new Date().toISOString().slice(0, 10) + 'T00:00:00Z',
        current_period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        bonus_credits: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  const usage = await getUserUsage(supabase, userId);
  if (!usage) {
    return { allowed: false, usage: null, message: 'Unable to determine usage' };
  }

  if (usage.articlesRemaining <= 0) {
    return {
      allowed: false,
      usage,
      message: `You've reached your ${usage.planName} plan limit of ${usage.articleLimit + usage.bonusCredits} articles this month. Upgrade your plan or contact support for additional credits.`,
    };
  }

  return { allowed: true, usage };
}

export async function updateSubscriptionPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: PlanId
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan_id: planId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update plan: ${error.message}`);
}

export async function addBonusCredits(
  supabase: SupabaseClient,
  userId: string,
  credits: number
): Promise<void> {
  // Get current bonus credits
  const sub = await getUserSubscription(supabase, userId);
  if (!sub) throw new Error('No subscription found');

  const { error } = await supabase
    .from('subscriptions')
    .update({
      bonus_credits: sub.bonusCredits + credits,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to add bonus credits: ${error.message}`);
}

// ── Article Types (shared/global) ───────────────────────

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

// ── Platform Profiles (shared/global) ───────────────────

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

// ── Workspace Stats (RPC) ───────────────────────────────

export interface WorkspaceStats {
  totalArticles: number;
  thisWeek: number;
  thisMonth: number;
  bySource: { youtube: number; loom: number; 'google-drive': number; paste: number };
}

const ZERO_STATS: WorkspaceStats = {
  totalArticles: 0,
  thisWeek: 0,
  thisMonth: 0,
  bySource: { youtube: 0, loom: 0, 'google-drive': 0, paste: 0 },
};

export async function getWorkspaceStats(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceStats> {
  const { data, error } = await supabase
    .rpc('get_workspace_stats', { p_workspace_id: workspaceId });

  if (error) throw new Error(`Failed to get workspace stats: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ...ZERO_STATS, bySource: { ...ZERO_STATS.bySource } };

  return {
    totalArticles: Number(row.total_articles),
    thisWeek: Number(row.this_week),
    thisMonth: Number(row.this_month),
    bySource: {
      youtube: Number(row.youtube_count),
      loom: Number(row.loom_count),
      'google-drive': Number(row.google_drive_count),
      paste: Number(row.paste_count),
    },
  };
}

// ── Articles (workspace-scoped) ─────────────────────────

export async function saveArticle(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  article: Omit<Article, 'id' | 'userId' | 'workspaceId' | 'createdAt'>
): Promise<string> {
  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
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
  title: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ title })
    .eq('id', articleId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update article title: ${error.message}`);
}

export async function updateArticleHtml(
  supabase: SupabaseClient,
  articleId: string,
  html: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ html })
    .eq('id', articleId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to update article HTML: ${error.message}`);
}

export async function getArticles(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*, article_types(name), platform_profiles(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load articles: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
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
  articleId: string,
  userId: string
): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    workspaceId: data.workspace_id,
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
  articleId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete article: ${error.message}`);
}
