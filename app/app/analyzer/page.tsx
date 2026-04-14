import Link from "next/link";
import { redirect } from "next/navigation";

export default function AnalyzerEntryPage() {
  const analyzerUrl = process.env.NEXT_PUBLIC_ANALYZER_URL ?? process.env.NEXT_PUBLIC_PRODUCT_URL;

  if (analyzerUrl) {
    redirect(analyzerUrl);
  }

  return (
    <main style={{ width: "min(1120px, 100% - 48px)", margin: "48px auto 88px" }}>
      <h1 style={{ fontSize: "clamp(28px, 4.8vw, 48px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
        Анализатор не настроен
      </h1>
      <p style={{ marginTop: 12, color: "#52525b", lineHeight: 1.7, fontSize: 16, maxWidth: "70ch" }}>
        Чтобы кнопки “Проверить сайт” и “Начать анализ” открывали анализатор, задайте переменную{" "}
        <code>NEXT_PUBLIC_ANALYZER_URL</code> (или <code>NEXT_PUBLIC_PRODUCT_URL</code>) в окружении.
      </p>
      <div style={{ marginTop: 18 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          Вернуться на главную
        </Link>
      </div>
    </main>
  );
}

