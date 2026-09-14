import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");

  if (!supplierId) {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }

  const notes = await prisma.note.findMany({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { supplierId?: string; text?: string };

    if (!body.supplierId || !body.text?.trim()) {
      return NextResponse.json(
        { error: "supplierId and text are required" },
        { status: 400 },
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: body.supplierId },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const note = await prisma.note.create({
      data: {
        supplierId: body.supplierId,
        text: body.text.trim(),
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create note" },
      { status: 500 },
    );
  }
}
