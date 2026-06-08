import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
  }

  try {
    const res = await fetch('http://localhost:8000/api/surveys/translate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(900_000),
    });

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      data = { detail: 'Invalid response from backend' };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Proxy error';
    if (message.includes('abort') || message.includes('timeout')) {
      return NextResponse.json(
        { detail: 'Translation request timed out (15 minute limit)' },
        { status: 504 }
      );
    }
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}
