import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Download Resume — Mannan';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  const bgImage = await fetch(
    new URL('../../../public/og-bg.jpg', import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <img
          src={bgImage as unknown as string}
          width={1200}
          height={630}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 300,
              color: 'white',
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            Mannan
          </div>
          <div
            style={{
              width: 80,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}
          >
            Health & Wellbeing — Engineer
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.9)',
              marginTop: '24px',
            }}
          >
            Download My Resume
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
