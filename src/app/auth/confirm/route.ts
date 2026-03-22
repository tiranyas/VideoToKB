import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next');

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email',
    });

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/login?mode=reset-password`);
      }
      return NextResponse.redirect(`${origin}${next || '/'}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_token`);
}
