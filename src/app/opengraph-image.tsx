import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const dynamic = 'force-static';
export const alt = 'Mannan';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  const bytes = await readFile(join(process.cwd(), 'public', 'og-bg.jpg'));
  const bgImage = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

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
        </div>
      </div>
    ),
    { ...size }
  );
}
