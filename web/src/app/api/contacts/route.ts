import { isAuthenticated } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(8),
  notes: z.string().optional(),
});

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      instruction: true,
    },
  });

  return NextResponse.json(contacts);
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await request.json();
  const data = contactSchema.parse(payload);

  const contact = await prisma.contact.create({
    data,
  });

  return NextResponse.json(contact, { status: 201 });
}
