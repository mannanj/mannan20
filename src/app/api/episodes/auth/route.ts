import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const valid = code === process.env.EPISODES_ACCESS_CODE;
    return NextResponse.json({ success: valid });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
