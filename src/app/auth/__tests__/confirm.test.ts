import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockVerifyOtp } = vi.hoisted(() => ({
  mockVerifyOtp: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      verifyOtp: mockVerifyOtp,
    },
  }),
}));

// Import after mock
import { GET } from '../confirm/route';

function makeRequest(url: string): Request {
  return new Request(url);
}

describe('/auth/confirm route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /login?mode=reset-password on valid recovery token', async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });

    const request = makeRequest('http://localhost:3000/auth/confirm?token_hash=abc123&type=recovery');
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'abc123',
      type: 'recovery',
    });
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('mode')).toBe('reset-password');
  });

  it('redirects to / on valid email token with no next param', async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });

    const request = makeRequest('http://localhost:3000/auth/confirm?token_hash=abc123&type=email');
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: 'abc123',
      type: 'email',
    });
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/');
  });

  it('redirects to /login?error=invalid_token when token_hash is missing', async () => {
    const request = makeRequest('http://localhost:3000/auth/confirm?type=recovery');
    const response = await GET(request);

    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('error')).toBe('invalid_token');
  });

  it('redirects to /login?error=invalid_token when verifyOtp fails', async () => {
    mockVerifyOtp.mockResolvedValue({ data: null, error: { message: 'Token expired' } });

    const request = makeRequest('http://localhost:3000/auth/confirm?token_hash=expired&type=recovery');
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('error')).toBe('invalid_token');
  });
});
