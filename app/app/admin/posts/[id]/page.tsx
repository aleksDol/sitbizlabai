import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { PostForm } from "../PostForm";
import { updatePostAction } from "../post-form-actions";
import styles from "../page.module.css";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function AdminPostEditPage({ params }: PageProps) {
  await requireAdmin();

  const resolvedParams = await Promise.resolve(params);
  const id = Number(resolvedParams.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      seoTitle: true,
      seoDescription: true,
      telegramUrl: true,
      productUrl: true,
      ctaTitle: true,
      ctaText: true,
      ctaTelegramText: true,
      ctaProductText: true,
      status: true,
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Post #{post.id}</h1>
      </div>

      <PostForm
        action={updatePostAction}
        submitLabel="Save Changes"
        postId={post.id}
        initialValues={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          content: post.content,
          coverImageUrl: post.coverImageUrl ?? "",
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          telegramUrl: post.telegramUrl ?? "",
          productUrl: post.productUrl ?? "",
          ctaTitle: post.ctaTitle ?? "",
          ctaText: post.ctaText ?? "",
          ctaTelegramText: post.ctaTelegramText ?? "",
          ctaProductText: post.ctaProductText ?? "",
          status: post.status.toLowerCase(),
        }}
      />

      <p>
        <Link href="/admin/posts" className={styles.editButton}>
          Back to posts
        </Link>
      </p>
    </main>
  );
}
