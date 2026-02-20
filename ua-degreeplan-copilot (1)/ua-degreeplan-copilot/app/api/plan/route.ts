import { NextRequest, NextResponse } from "next/server";
import { MOCK_PLAN_RESULT } from "@/data/mockData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, transcriptText } = body;

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json(
        { error: "Transcript text is required" },
        { status: 400 }
      );
    }

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 600));

    // In production, replace this block with your real AI/backend call:
    // const result = await callGeminiAPI(profile, transcriptText);

    // Adjust mock based on profile
    const result = {
      ...MOCK_PLAN_RESULT,
      estimatedGraduationTerm: profile?.graduationTerm || MOCK_PLAN_RESULT.estimatedGraduationTerm,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Plan API error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan. Please try again." },
      { status: 500 }
    );
  }
}
