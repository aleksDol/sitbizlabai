import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isUniqueConstraintError,
  normalizeCreatePublishState,
  validateCreatePostPayload,
} from "@/lib/post-validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateCreatePostPayload(body);

    if (!validation.ok) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const data = normalizeCreatePublishState(validation.data);
    const post = await prisma.post.create({ data });
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error, "slug")) {
      return NextResponse.json({ error: "Slug must be unique." }, { status: 409 });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    console.error("POST /api/posts error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
