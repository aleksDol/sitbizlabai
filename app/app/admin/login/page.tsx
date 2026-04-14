import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { loginAction } from "../actions";
import styles from "./page.module.css";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }> | { error?: string; next?: string };
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const params = await Promise.resolve(searchParams);
  const hasError = params.error === "1";
  const next = params.next?.startsWith("/admin") ? params.next : "/admin";

  return (
    <main className={styles.page}>
      <form action={loginAction} className={styles.form}>
        <h1 className={styles.title}>Admin Login</h1>
        {hasError ? <p className={styles.error}>Неверный email или пароль.</p> : null}

        <input type="hidden" name="next" value={next} />

        <label className={styles.label}>
          Email
          <input className={styles.input} type="email" name="email" required />
        </label>

        <label className={styles.label}>
          Password
          <input className={styles.input} type="password" name="password" required />
        </label>

        <button className={styles.button} type="submit">
          Login
        </button>
      </form>
    </main>
  );
}
