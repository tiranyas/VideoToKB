import { createClient } from '@/lib/supabase/server';
import { createApiKeyForUser, listApiKeys, revokeApiKey } from '@/lib/api-keys';

/** GET /api/api-keys — List user's API keys */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await listApiKeys(user.id);
    return Response.json({ keys });
  } catch {
    return Response.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

/** POST /api/api-keys — Create a new API key */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Limit to 3 keys per user
  const existing = await listApiKeys(user.id);
  if (existing.length >= 3) {
    return Response.json({ error: 'Maximum 3 API keys allowed. Revoke an existing key first.' }, { status: 400 });
  }

  let name = 'Default';
  try {
    const body = await req.json();
    if (body.name) name = String(body.name).slice(0, 50);
  } catch {
    // Use default name
  }

  try {
    const { key, id } = await createApiKeyForUser(user.id, name);
    return Response.json({ key, id, name });
  } catch {
    return Response.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

/** DELETE /api/api-keys — Revoke an API key */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'Key ID is required' }, { status: 400 });

    await revokeApiKey(user.id, id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
