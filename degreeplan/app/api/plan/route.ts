import { NextRequest, NextResponse } from 'next/server';
import { generateDegreePlan } from '@/lib/gemini';
import { getAllCourses, savePlan } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcriptText, major, secondMajor, standing, gradTerm, maxUnits, includeSummer } = body;

    if (!transcriptText?.trim()) return NextResponse.json({ error: 'transcriptText is required' }, { status: 400 });
    if (!major)                  return NextResponse.json({ error: 'major is required' },          { status: 400 });

    const courses = getAllCourses();
    if (!courses.length) return NextResponse.json({ error: 'No courses in database. Go to Advisor → Upload PDF Catalog or Add Course Manually.' }, { status: 422 });

    const result = await generateDegreePlan({ transcriptText, major, secondMajor, standing, gradTerm, maxUnits, includeSummer, courses });

    savePlan({ major, second_major: secondMajor, standing, grad_term: gradTerm, max_units: maxUnits, include_summer: includeSummer, transcript_text: transcriptText, result_json: JSON.stringify(result), feasibility: result.feasibility });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[/api/plan]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
