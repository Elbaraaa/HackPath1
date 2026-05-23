import { NextRequest, NextResponse } from 'next/server';
import { getAllCourses, savePlan } from '@/lib/db';
import { generateDegreePlan } from '@/lib/gemini';
import { generateSnapshotPlan } from '@/lib/planner';
import { importAdvisementText } from '@/lib/advisement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transcriptText,
      major,
      secondMajor,
      standing,
      gradTerm,
      maxUnits,
      includeSummer,
      snapshotId,
      source,
      studentName,
      studentEmail,
      studentId,
      studentType,
      finalTermApproval
    } = body;

    const useLlmTranscriptPlanner = source === 'llm' || source === 'ai-transcript';

    if (!useLlmTranscriptPlanner) {
      let effectiveSnapshotId = Number(snapshotId || 0);
      let sourceSnapshot: any = effectiveSnapshotId ? { snapshotId: effectiveSnapshotId } : null;

      if (!effectiveSnapshotId && transcriptText?.trim()) {
        const imported = await importAdvisementText(transcriptText, { major });
        effectiveSnapshotId = imported.snapshotId;
        sourceSnapshot = imported;
      }

      if (!effectiveSnapshotId) {
        return NextResponse.json(
          { error: 'Paste or upload an advisement report before generating a plan.' },
          { status: 400 }
        );
      }

      const result = await generateSnapshotPlan({
        snapshotId: effectiveSnapshotId,
        maxUnits,
        includeSummer,
        gradTerm,
        major,
        secondMajor,
        standing,
        studentName,
        studentEmail,
        studentId,
        studentType,
        finalTermApproval
      });
      return NextResponse.json({ ...result, sourceSnapshot });
    }

    if (!transcriptText?.trim()) return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    if (!major)                  return NextResponse.json({ error: 'Major is required' },      { status: 400 });

    const courses = await getAllCourses();
    const result  = await generateDegreePlan({ transcriptText, major, secondMajor, standing, gradTerm, maxUnits, includeSummer, courses });

    await savePlan({
      major, second_major: secondMajor, standing, grad_term: gradTerm,
      max_units: maxUnits, include_summer: includeSummer,
      transcript_text: transcriptText, result_json: result, feasibility: result.feasibility,
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[POST /api/plan]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
