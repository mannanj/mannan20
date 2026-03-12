import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Download Resume — Mannan';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
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
          background: 'linear-gradient(145deg, #0b0b0b 0%, #111827 50%, #0b0b0b 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(3, 155, 229, 0.12) 0%, transparent 70%)',
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
              background: 'linear-gradient(90deg, transparent, #039be5, transparent)',
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 28,
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.6)',
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}
          >
            Wellbeing, Health and Happiness
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: '#039be5',
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
