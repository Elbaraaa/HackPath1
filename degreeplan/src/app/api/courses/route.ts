import { NextRequest, NextResponse } from 'next/server';
import { getAllCourses, getCoursesPage, upsertCourse, updateCourse, deleteCourse } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('all') === '1') {
      const courses = await getAllCourses();
      return NextResponse.json({ courses, total: courses.length, limit: courses.length, offset: 0 });
    }

    const result = await getCoursesPage({
      limit: Number(searchParams.get('limit') || 200),
      offset: Number(searchParams.get('offset') || 0),
      q: searchParams.get('q') || undefined,
      major: searchParams.get('major') || undefined,
      category: searchParams.get('category') || undefined
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[GET /api/courses]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const course = await upsertCourse(body);
    return NextResponse.json({ course }, { status: 201 });
  } catch (e: any) {
    console.error('[POST /api/courses]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') ?? '');
    if (isNaN(id)) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const body   = await req.json();
    const course = await updateCourse(id, body);
    return NextResponse.json({ course });
  } catch (e: any) {
    console.error('[PUT /api/courses]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') ?? '');
    if (isNaN(id)) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await deleteCourse(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[DELETE /api/courses]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
