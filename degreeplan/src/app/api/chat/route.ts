import { NextRequest, NextResponse } from 'next/server';
import { getAllCourses } from '@/lib/db';
import { chatAdvisorTurn } from '@/lib/gemini';

type ElectiveContext = {
  requirement?: string;
  requirementTitle?: string;
  options?: string[];
};

function parseRetrySeconds(message: string) {
  const retryDelay = message.match(/retryDelay["':\s]*(\d+(?:\.\d+)?)/i);
  const retryIn = message.match(/retry in (\d+(?:\.\d+)?)s/i);
  const retryInfo = message.match(/"retryDelay":"(\d+)s"/i);
  const value = retryDelay?.[1] || retryIn?.[1] || retryInfo?.[1];
  return value ? Math.ceil(Number(value)) : 60;
}

function isQuotaError(message: string) {
  return /429|Too Many Requests|quota|rate[- ]?limit/i.test(message);
}

export async function POST(req: NextRequest) {
  try {
    const { history, message, electiveContext } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const allCourses = await getAllCourses();
    const context = electiveContext as ElectiveContext | undefined;
    const allowedOptions = new Set((context?.options || []).filter((option: string) => option && option !== 'Elective'));
    const courses = allowedOptions.size
      ? [
          ...allCourses.filter(course => allowedOptions.has(course.code)),
          ...[...allowedOptions]
            .filter(code => !allCourses.some(course => course.code === code))
            .map(code => ({
              code,
              title: code,
              units: 3,
              category: context?.requirementTitle || 'Elective',
              major: 'Approved elective option',
              description: `Approved option for ${context?.requirementTitle || 'this elective requirement'}.`,
              syllabus: '',
              prereqs: [],
              offered: []
            }))
        ]
      : allCourses;
    const fullHistory = [...(history || []), { role: 'user', parts: message }];
    const reply   = await chatAdvisorTurn(fullHistory, courses, context);

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('[POST /api/chat]', e);
    const message = String(e?.message || 'Chat advisor failed');
    if (isQuotaError(message)) {
      return NextResponse.json({
        error: 'Gemini is rate-limiting this key right now. Wait about a minute, then try again.',
        retryAfter: parseRetrySeconds(message)
      }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
