"use server";

import { PostStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  isUniqueConstraintError,
  normalizeCreatePublishState,
  normalizeUpdatePublishState,
  validateCreatePostPayload,
} from "@/lib/post-validation";
import { readPostFormValues, toCreatePayload } from "./post-form-utils";

export type PostFormState = {
  errors: string[];
};

export async function createPostAction(
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const values = readPostFormValues(formData);
  const validation = validateCreatePostPayload(toCreatePayload(values));

  if (!validation.ok) {
    return { errors: validation.errors };
  }

  const data = normalizeCreatePublishState(validation.data);

  try {
    await prisma.post.create({ data });
  } catch (error) {
    if (isUniqueConstraintError(error, "slug")) {
      return { errors: ["Slug must be unique."] };
    }
    return { errors: ["Failed to create post."] };
  }

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  redirect("/admin/posts");
}

export async function updatePostAction(
  _prevState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { errors: ["Invalid post id."] };
  }

  const values = readPostFormValues(formData);
  const validation = validateCreatePostPayload(toCreatePayload(values));

  if (!validation.ok) {
    return { errors: validation.errors };
  }

  const current = await prisma.post.findUnique({
    where: { id },
    select: { status: true, publishedAt: true },
  });

  if (!current) {
    return { errors: ["Post not found."] };
  }

  const updateData: Prisma.PostUpdateInput = {
    ...validation.data,
  };

  const data = normalizeUpdatePublishState(
    {
      status: current.status as PostStatus,
      publishedAt: current.publishedAt,
    },
    updateData,
  );

  try {
    await prisma.post.update({
      where: { id },
      data,
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "slug")) {
      return { errors: ["Slug must be unique."] };
    }
    return { errors: ["Failed to update post."] };
  }

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${values.slug}`);
  redirect("/admin/posts");
}
