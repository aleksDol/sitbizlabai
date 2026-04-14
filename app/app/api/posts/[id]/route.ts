import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isUniqueConstraintError,
  normalizeUpdatePublishState,
  parsePostId,
  validateUpdatePostPayload,
} from "@/lib/post-validation";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function getIdFromContext(context: RouteContext): Promise<number | null> {
  const params = await Promise.resolve(context.params);
  return parsePostId(params.id);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = await getIdFromContext(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("GET /api/posts/[id] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = await getIdFromContext(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateUpdatePostPayload(body);
    if (!validation.ok) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    const current = await prisma.post.findUnique({
      where: { id },
      select: { status: true, publishedAt: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    const data = normalizeUpdatePublishState(current, validation.data);
    const updatedPost = await prisma.post.update({
      where: { id },
      data,
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    if (isUniqueConstraintError(error, "slug")) {
      return NextResponse.json({ error: "Slug must be unique." }, { status: 409 });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    console.error("PUT /api/posts/[id] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = await getIdFromContext(context);
    if (!id) {
      return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
