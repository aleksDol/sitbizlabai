import Link from "next/link";
import { LeadStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import styles from "./leads.module.css";

type PageProps = {
  searchParams: Promise<{ status?: string }> | { status?: string };
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Новый",
  CONTACTED: "Связался",
  WON: "Заключена сделка",
  LOST: "Отказ",
};

function parseStatusFilter(raw: string | undefined): LeadStatus | "ALL" {
  if (!raw) return "ALL";
  const normalized = raw.trim().toUpperCase();
  if (normalized === "ALL") return "ALL";
  if (normalized === "NEW") return LeadStatus.NEW;
  if (normalized === "CONTACTED") return LeadStatus.CONTACTED;
  if (normalized === "WON") return LeadStatus.WON;
  if (normalized === "LOST") return LeadStatus.LOST;
  return "ALL";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusPillClass(status: LeadStatus): string {
  if (status === LeadStatus.NEW) return `${styles.pill} ${styles.pillNew}`;
  if (status === LeadStatus.CONTACTED) return `${styles.pill} ${styles.pillContacted}`;
  if (status === LeadStatus.WON) return `${styles.pill} ${styles.pillWon}`;
  return `${styles.pill} ${styles.pillLost}`;
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await Promise.resolve(searchParams);
  const filter = parseStatusFilter(params.status);

  const leads = await prisma.lead.findMany({
    where: filter === "ALL" ? undefined : { status: filter },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      contact: true,
      websiteUrl: true,
      status: true,
      createdAt: true,
    },
  });

  const filters: Array<{ label: string; value: "ALL" | LeadStatus }> = [
    { label: "Все", value: "ALL" },
    { label: "Новый", value: LeadStatus.NEW },
    { label: "Связался", value: LeadStatus.CONTACTED },
    { label: "Заключена сделка", value: LeadStatus.WON },
    { label: "Отказ", value: LeadStatus.LOST },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Заявки</h1>
        <nav className={styles.filters} aria-label="Lead status filter">
          {filters.map((item) => {
            const isActive = filter === item.value;
            const href = item.value === "ALL" ? "/admin/leads" : `/admin/leads?status=${item.value}`;
            const className = isActive
              ? `${styles.filter} ${styles.filterActive}`
              : styles.filter;
            return (
              <Link key={item.value} href={href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {leads.length === 0 ? (
        <p className={styles.empty}>Пока нет заявок.</p>
      ) : (
        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Контакт</th>
                <th>Сайт</th>
                <th>Статус</th>
                <th>Создана</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{lead.contact}</td>
                  <td className={styles.muted}>{lead.websiteUrl || "—"}</td>
                  <td>
                    <span className={statusPillClass(lead.status)}>{STATUS_LABELS[lead.status]}</span>
                  </td>
                  <td className={styles.muted}>{formatDate(lead.createdAt)}</td>
                  <td>
                    <Link className={styles.openLink} href={`/admin/leads/${lead.id}`}>
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
