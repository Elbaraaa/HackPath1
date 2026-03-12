import { NextRequest, NextResponse } from 'next/server';
import { chatAdvisorTurn } from '@/lib/gemini';
import { getAllCourses } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { history, message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const courses = getAllCourses();
    const fullHistory = [...(history || []), { role: 'user' as const, parts: message }];
    const reply = await chatAdvisorTurn(fullHistory, courses);
    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('[/api/chat]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
