import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'KBPipe — AI-Powered Knowledge Base Generator';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #06b6d4 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '32px',
            padding: '60px 80px',
            maxWidth: '1000px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          }}
        >
          {/* Logo area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '28px',
                fontWeight: 800,
              }}
            >
              KB
            </div>
            <span style={{ fontSize: '36px', fontWeight: 700, color: '#111827' }}>
              KBPipe
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.2,
              color: '#111827',
              marginBottom: '16px',
            }}
          >
            Turn any content into
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.2,
              background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: '24px',
            }}
          >
            publish-ready KB articles
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '22px',
              color: '#6b7280',
              textAlign: 'center',
              maxWidth: '700px',
            }}
          >
            Video URLs, transcripts, user stories — AI generates structured articles for Zendesk, Intercom, HelpJuice & more
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            marginTop: '32px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 600,
          }}
        >
          kbpipe.io — Free to start
        </div>
      </div>
    ),
    { ...size }
  );
}
