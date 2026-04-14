import { PostStatus, Prisma } from "@prisma/client";

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

type PostPayload = Record<string, unknown>;

const OPTIONAL_STRING_FIELDS = [
  "excerpt",
  "coverImageUrl",
  "seoTitle",
  "seoDescription",
  "telegramUrl",
  "productUrl",
  "ctaTitle",
  "ctaText",
  "ctaTelegramText",
  "ctaProductText",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStatus(value: unknown): PostStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "draft") {
    return PostStatus.DRAFT;
  }

  if (normalized === "published") {
    return PostStatus.PUBLISHED;
  }

  return undefined;
}

function parsePublishedAt(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function validateCreatePostPayload(payload: unknown): ValidationResult<Prisma.PostCreateInput> {
  if (!isObject(payload)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const errors: string[] = [];
  const data: Prisma.PostCreateInput = {
    title: "",
    slug: "",
    content: "",
  };

  const title = normalizeString(payload.title);
  if (!title) {
    errors.push("Field 'title' is required.");
  } else {
    data.title = title;
  }

  const slug = normalizeString(payload.slug);
  if (!slug) {
    errors.push("Field 'slug' is required.");
  } else {
    data.slug = slug;
  }

  const content = normalizeString(payload.content);
  if (!content || htmlToText(content).length === 0) {
    errors.push("Field 'content' is required.");
  } else {
    data.content = content;
  }

  const status = parseStatus(payload.status);
  if (payload.status !== undefined && !status) {
    errors.push("Field 'status' must be 'draft' or 'published'.");
  } else if (status) {
    data.status = status;
  }

  const publishedAt = parsePublishedAt(payload.publishedAt);
  if (payload.publishedAt !== undefined && publishedAt === undefined) {
    errors.push("Field 'publishedAt' must be a valid ISO date string or null.");
  } else if (publishedAt !== undefined) {
    data.publishedAt = publishedAt;
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (payload[field] === undefined) {
      continue;
    }

    const value = normalizeString(payload[field]);
    if (value === undefined) {
      errors.push(`Field '${field}' must be a string.`);
      continue;
    }

    data[field] = value.length > 0 ? value : null;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function validateUpdatePostPayload(
  payload: unknown,
): ValidationResult<Prisma.PostUpdateInput> {
  if (!isObject(payload)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const errors: string[] = [];
  const data: Prisma.PostUpdateInput = {};

  if (payload.title !== undefined) {
    const title = normalizeString(payload.title);
    if (!title) {
      errors.push("Field 'title' must be a non-empty string.");
    } else {
      data.title = title;
    }
  }

  if (payload.slug !== undefined) {
    const slug = normalizeString(payload.slug);
    if (!slug) {
      errors.push("Field 'slug' must be a non-empty string.");
    } else {
      data.slug = slug;
    }
  }

  if (payload.content !== undefined) {
    const content = normalizeString(payload.content);
    if (!content || htmlToText(content).length === 0) {
      errors.push("Field 'content' must be a non-empty string.");
    } else {
      data.content = content;
    }
  }

  const status = parseStatus(payload.status);
  if (payload.status !== undefined && !status) {
    errors.push("Field 'status' must be 'draft' or 'published'.");
  } else if (status) {
    data.status = status;
  }

  const publishedAt = parsePublishedAt(payload.publishedAt);
  if (payload.publishedAt !== undefined && publishedAt === undefined) {
    errors.push("Field 'publishedAt' must be a valid ISO date string or null.");
  } else if (publishedAt !== undefined) {
    data.publishedAt = publishedAt;
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (payload[field] === undefined) {
      continue;
    }

    const value = normalizeString(payload[field]);
    if (value === undefined) {
      errors.push(`Field '${field}' must be a string.`);
      continue;
    }

    data[field] = value.length > 0 ? value : null;
  }

  if (Object.keys(data).length === 0) {
    errors.push("At least one field must be provided for update.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}

export function parsePostId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export function normalizeCreatePublishState(data: Prisma.PostCreateInput): Prisma.PostCreateInput {
  if (data.status === PostStatus.PUBLISHED && data.publishedAt === undefined) {
    return { ...data, publishedAt: new Date() };
  }

  return data;
}

export function normalizeUpdatePublishState(
  current: { status: PostStatus; publishedAt: Date | null },
  data: Prisma.PostUpdateInput,
): Prisma.PostUpdateInput {
  if (data.status === PostStatus.PUBLISHED && data.publishedAt === undefined) {
    if (current.status !== PostStatus.PUBLISHED || current.publishedAt === null) {
      return { ...data, publishedAt: new Date() };
    }
  }

  return data;
}

export function isUniqueConstraintError(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes(field);
  }

  if (typeof target === "string") {
    return target === field || target.includes(field);
  }

  return false;
}
