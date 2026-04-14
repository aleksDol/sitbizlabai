import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { logoutAction } from "./actions";
import styles from "./page.module.css";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.links}>
          <Link href="/admin/posts" className={styles.link}>
            Manage Posts
          </Link>
          <Link href="/admin/leads" className={styles.link}>
            Leads
          </Link>
          <Link href="/blog" className={styles.link}>
            Open Blog
          </Link>
        </div>

        <form action={logoutAction}>
          <button type="submit" className={styles.logout}>
            Logout
          </button>
        </form>
      </div>
    </main>
  );
}
