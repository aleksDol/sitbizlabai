import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { LeadEditor } from "./LeadEditor";
import styles from "./lead-details.module.css";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Новый",
  CONTACTED: "Связался",
  WON: "Заключена сделка",
  LOST: "Отказ",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNullable(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  return String(value);
}

export default async function AdminLeadDetailsPage({ params }: PageProps) {
  await requireAdmin();
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id?.trim();

  if (!id) {
    notFound();
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!lead) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <Link href="/admin/leads" className={styles.backLink}>
        ← Назад к заявкам
      </Link>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>Заявка</h1>
        <div className={styles.meta}>
          <div>ID: {lead.id}</div>
          <div>
            {STATUS_LABELS[lead.status]} · {formatDate(lead.createdAt)}
          </div>
        </div>
      </div>

      <section className={styles.grid}>
        <div style={{ display: "grid", gap: 14 }}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Контакты</h2>
            <div className={styles.row}>
              <div className={styles.label}>Имя</div>
              <div className={styles.value}>{lead.name}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Контакт</div>
              <div className={styles.value}>{lead.contact}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Сайт</div>
              <div className={styles.value}>{formatNullable(lead.websiteUrl)}</div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Что увидел клиент</h2>
            <div className={styles.textBlock}>
              <div className={styles.label} style={{ marginBottom: 6 }}>
                analysisText
              </div>
              <div className={lead.analysisText ? styles.textBlock : styles.muted}>
                {lead.analysisText || "—"}
              </div>
            </div>
            <div className={styles.textBlock}>
              <div className={styles.label} style={{ marginBottom: 6 }}>
                lossesText
              </div>
              <div className={lead.lossesText ? styles.textBlock : styles.muted}>
                {lead.lossesText || "—"}
              </div>
            </div>
            <div className={styles.textBlock}>
              <div className={styles.label} style={{ marginBottom: 6 }}>
                solutionOfferText
              </div>
              <div className={lead.solutionOfferText ? styles.textBlock : styles.muted}>
                {lead.solutionOfferText || "—"}
              </div>
            </div>
          </section>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Контекст заявки</h2>
            <div className={styles.row}>
              <div className={styles.label}>siteType</div>
              <div className={styles.value}>{formatNullable(lead.siteType)}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>hasRepeatSales</div>
              <div className={styles.value}>{formatNullable(lead.hasRepeatSales)}</div>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>trafficSources</div>
              <div className={styles.value}>{formatNullable(lead.trafficSources)}</div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Работа с заявкой</h2>
            <LeadEditor
              leadId={lead.id}
              initialStatus={lead.status as unknown as "NEW" | "CONTACTED" | "WON" | "LOST"}
              initialManagerComment={lead.managerComment}
            />
          </section>
        </div>
      </section>
    </main>
  );
}

