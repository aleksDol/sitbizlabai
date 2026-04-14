import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { PostForm } from "../PostForm";
import { createPostAction } from "../post-form-actions";
import styles from "../page.module.css";

export default async function AdminPostsNewPage() {
  await requireAdmin();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Post</h1>
      </div>
      <PostForm action={createPostAction} submitLabel="Create Post" />
      <p>
        <Link href="/admin/posts" className={styles.editButton}>
          Back to posts
        </Link>
      </p>
    </main>
  );
}
