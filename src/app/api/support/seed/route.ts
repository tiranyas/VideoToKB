import { createClient } from '@supabase/supabase-js';
import { SUPPORT_DOCS } from '@/lib/support/docs';

/**
 * Seed/update support docs in the database.
 * Called on deploy via Vercel Deploy Hook or manually.
 * Protected by a secret token.
 */
export async function POST(req: Request) {
  // Verify seed token
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.SUPPORT_SEED_TOKEN;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const results: { slug: string; status: string }[] = [];

  for (const doc of SUPPORT_DOCS) {
    try {
      // Upsert doc
      const { data: docRow, error: docErr } = await supabase
        .from('support_docs')
        .upsert(
          {
            slug: doc.slug,
            title: doc.title,
            category: doc.category,
            content: doc.chunks.join('\n\n'),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        )
        .select('id')
        .single();

      if (docErr || !docRow) {
        results.push({ slug: doc.slug, status: `error: ${docErr?.message}` });
        continue;
      }

      // Delete old chunks and insert new ones
      await supabase
        .from('support_doc_chunks')
        .delete()
        .eq('doc_id', docRow.id);

      const chunks = doc.chunks.map((content, i) => ({
        doc_id: docRow.id,
        chunk_index: i,
        content,
        token_count: Math.ceil(content.length / 4), // rough estimate
      }));

      const { error: chunkErr } = await supabase
        .from('support_doc_chunks')
        .insert(chunks);

      if (chunkErr) {
        results.push({ slug: doc.slug, status: `chunks error: ${chunkErr.message}` });
      } else {
        results.push({ slug: doc.slug, status: 'ok' });
      }
    } catch (err) {
      results.push({ slug: doc.slug, status: `exception: ${err}` });
    }
  }

  return Response.json({
    seeded: results.filter(r => r.status === 'ok').length,
    total: SUPPORT_DOCS.length,
    results,
  });
}
