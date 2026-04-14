"use client";

import { useActionState, useMemo, useState, type ChangeEvent } from "react";
import {
  type PostFormState,
} from "./post-form-actions";
import {
  type PostFormValues,
  EMPTY_POST_FORM_VALUES,
  slugify,
} from "./post-form-utils";
import { TiptapEditor } from "./TiptapEditor";
import { uploadImage } from "./upload-image";
import styles from "./post-form.module.css";

const INITIAL_POST_FORM_STATE: PostFormState = { errors: [] };

type PostFormProps = {
  action: (prevState: PostFormState, formData: FormData) => Promise<PostFormState>;
  submitLabel: string;
  initialValues?: PostFormValues;
  postId?: number;
};

type FieldProps = {
  label: string;
  name: keyof PostFormValues;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
};

function Field({ label, name, value, onChange, multiline = false, rows = 3 }: FieldProps) {
  if (multiline) {
    return (
      <label className={styles.field}>
        <span>{label}</span>
        <textarea
          className={styles.textarea}
          name={name}
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        className={styles.input}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function PostForm({ action, submitLabel, initialValues, postId }: PostFormProps) {
  const defaults = useMemo(
    () => ({
      ...EMPTY_POST_FORM_VALUES,
      ...initialValues,
    }),
    [initialValues],
  );

  const [state, formAction, pending] = useActionState(action, INITIAL_POST_FORM_STATE);
  const [title, setTitle] = useState(defaults.title);
  const [slug, setSlug] = useState(defaults.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(defaults.slug));
  const [values, setValues] = useState(defaults);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  const setField = (field: keyof PostFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const onTitleChange = (value: string) => {
    setTitle(value);
    setField("title", value);

    if (!slugEdited) {
      const generatedSlug = slugify(value);
      setSlug(generatedSlug);
      setField("slug", generatedSlug);
    }
  };

  const onSlugChange = (value: string) => {
    setSlug(value);
    setField("slug", value);
    setSlugEdited(value.trim().length > 0);
  };

  const onCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setCoverUploading(true);
      setCoverUploadError(null);
      const url = await uploadImage(file);
      setField("coverImageUrl", url);
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setCoverUploading(false);
      event.target.value = "";
    }
  };

  return (
    <form action={formAction} className={styles.form}>
      {postId ? <input type="hidden" name="id" value={postId} /> : null}

      {state.errors.length > 0 ? (
        <div className={styles.errors}>
          {state.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <Field label="Title" name="title" value={title} onChange={onTitleChange} />
      <Field label="Slug" name="slug" value={slug} onChange={onSlugChange} />
      <Field
        label="Excerpt"
        name="excerpt"
        value={values.excerpt}
        onChange={(value) => setField("excerpt", value)}
        multiline
        rows={4}
      />
      <label className={styles.field}>
        <span>Content</span>
        <input type="hidden" name="content" value={values.content} />
        <TiptapEditor value={values.content} onChange={(value) => setField("content", value)} />
      </label>
      <Field
        label="Cover Image URL"
        name="coverImageUrl"
        value={values.coverImageUrl}
        onChange={(value) => setField("coverImageUrl", value)}
      />
      <label className={styles.field}>
        <span>Upload Cover Image</span>
        <input type="file" accept="image/*" onChange={onCoverUpload} />
        {coverUploading ? <p className={styles.hint}>Uploading cover image...</p> : null}
        {coverUploadError ? <p className={styles.fieldError}>{coverUploadError}</p> : null}
      </label>
      <Field label="SEO Title" name="seoTitle" value={values.seoTitle} onChange={(value) => setField("seoTitle", value)} />
      <Field
        label="SEO Description"
        name="seoDescription"
        value={values.seoDescription}
        onChange={(value) => setField("seoDescription", value)}
        multiline
        rows={4}
      />
      <Field
        label="Telegram URL"
        name="telegramUrl"
        value={values.telegramUrl}
        onChange={(value) => setField("telegramUrl", value)}
      />
      <Field
        label="Product URL"
        name="productUrl"
        value={values.productUrl}
        onChange={(value) => setField("productUrl", value)}
      />
      <Field label="CTA Title" name="ctaTitle" value={values.ctaTitle} onChange={(value) => setField("ctaTitle", value)} />
      <Field
        label="CTA Text"
        name="ctaText"
        value={values.ctaText}
        onChange={(value) => setField("ctaText", value)}
        multiline
        rows={4}
      />
      <Field
        label="CTA Telegram Text"
        name="ctaTelegramText"
        value={values.ctaTelegramText}
        onChange={(value) => setField("ctaTelegramText", value)}
      />
      <Field
        label="CTA Product Text"
        name="ctaProductText"
        value={values.ctaProductText}
        onChange={(value) => setField("ctaProductText", value)}
      />

      <label className={styles.field}>
        <span>Status</span>
        <select
          className={styles.select}
          name="status"
          value={values.status}
          onChange={(event) => setField("status", event.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
