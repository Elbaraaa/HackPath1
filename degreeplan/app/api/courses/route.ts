import { NextRequest, NextResponse } from 'next/server';
import { getAllCourses, upsertCourse, updateCourse, deleteCourse } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json({ courses: getAllCourses() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const course = upsertCourse(await req.json());
    return NextResponse.json({ course }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = parseInt(req.nextUrl.searchParams.get('id') || '');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const course = updateCourse(id, await req.json());
    return NextResponse.json({ course });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = parseInt(req.nextUrl.searchParams.get('id') || '');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    deleteCourse(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
