import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

/** Generate a random API key with `vtk_` prefix */
export function generateApiKey(): string {
  return `vtk_${crypto.randomBytes(24).toString('hex')}`;
}

/** SHA-256 hash of a key for storage */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** First 12 chars of the key for display (vtk_XXXXXXXX) */
export function keyPrefix(key: string): string {
  return key.slice(0, 12);
}

/** Validate an API key and return the user_id if valid */
export async function validateApiKey(key: string): Promise<string | null> {
  const hash = hashApiKey(key);

  const { data, error } = await getAdmin()
    .from('api_keys')
    .select('user_id')
    .eq('key_hash', hash)
    .maybeSingle();

  if (error || !data) return null;

  // Update last_used_at (fire and forget)
  getAdmin()
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_hash', hash)
    .then(() => {});

  return data.user_id;
}

/** Create a new API key for a user. Returns the raw key (only shown once). */
export async function createApiKeyForUser(
  userId: string,
  name = 'Default'
): Promise<{ key: string; id: string }> {
  const rawKey = generateApiKey();
  const hash = hashApiKey(rawKey);
  const prefix = keyPrefix(rawKey);

  const { data, error } = await getAdmin()
    .from('api_keys')
    .insert({
      user_id: userId,
      key_hash: hash,
      key_prefix: prefix,
      name,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create API key: ${error.message}`);

  return { key: rawKey, id: data.id };
}

/** List all API keys for a user (hashed — prefix only) */
export async function listApiKeys(userId: string) {
  const { data, error } = await getAdmin()
    .from('api_keys')
    .select('id, key_prefix, name, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list API keys: ${error.message}`);
  return data ?? [];
}

/** Revoke (delete) an API key */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const { error } = await getAdmin()
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`);
}
