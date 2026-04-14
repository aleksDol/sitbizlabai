const FORM_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "content",
  "coverImageUrl",
  "seoTitle",
  "seoDescription",
  "telegramUrl",
  "productUrl",
  "ctaTitle",
  "ctaText",
  "ctaTelegramText",
  "ctaProductText",
  "status",
] as const;

type FormField = (typeof FORM_FIELDS)[number];

export type PostFormValues = Record<FormField, string>;

function normalizeFormValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function readPostFormValues(formData: FormData): PostFormValues {
  const values = {} as PostFormValues;

  for (const field of FORM_FIELDS) {
    values[field] = normalizeFormValue(formData.get(field));
  }

  if (!values.slug && values.title) {
    values.slug = slugify(values.title);
  }

  if (!values.status) {
    values.status = "published";
  }

  return values;
}

export function toCreatePayload(values: PostFormValues): Record<string, unknown> {
  return {
    title: values.title,
    slug: values.slug,
    excerpt: values.excerpt,
    content: values.content,
    coverImageUrl: values.coverImageUrl,
    seoTitle: values.seoTitle,
    seoDescription: values.seoDescription,
    telegramUrl: values.telegramUrl,
    productUrl: values.productUrl,
    ctaTitle: values.ctaTitle,
    ctaText: values.ctaText,
    ctaTelegramText: values.ctaTelegramText,
    ctaProductText: values.ctaProductText,
    status: values.status,
  };
}

export const EMPTY_POST_FORM_VALUES: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  telegramUrl: "",
  productUrl: "",
  ctaTitle: "",
  ctaText: "",
  ctaTelegramText: "",
  ctaProductText: "",
  status: "published",
};
