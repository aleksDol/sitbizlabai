import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { deletePostAction } from "../actions";
import styles from "./page.module.css";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function AdminPostsPage() {
  await requireAdmin();

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Posts</h1>
        <Link href="/admin/posts/new" className={styles.newButton}>
          New
        </Link>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>{post.id}</td>
                <td>{post.title}</td>
                <td>{post.slug}</td>
                <td>{post.status.toLowerCase()}</td>
                <td>{formatDate(post.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <Link className={styles.editButton} href={`/admin/posts/${post.id}`}>
                      Edit
                    </Link>
                    <form action={deletePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button type="submit" className={styles.deleteButton}>
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
