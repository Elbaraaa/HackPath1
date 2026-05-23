import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { importAdvisementText } from '@/lib/advisement';

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const major = String(form.get('major') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Advisement report file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const parsed = await pdfParse(buffer);
      const text = parsed.text || '';
      const imported = await importAdvisementText(text, { major });
      return NextResponse.json({ text, ...imported });
    }

    const text = buffer.toString('utf8');
    const imported = await importAdvisementText(text, { major });
    return NextResponse.json({ text, ...imported });
  } catch (e: any) {
    console.error('[POST /api/transcript]', e);
    return NextResponse.json({ error: e.message || 'Advisement report upload failed' }, { status: 500 });
  }
}
