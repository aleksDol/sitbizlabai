import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"),
  title: {
    default: "SiteBizAI — аудит сайта за 30 секунд",
    template: "%s — SiteBizAI",
  },
  description: "Найдём ошибки в UX, SEO и конверсии. Дадим конкретный план улучшений и точки роста.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "SiteBizAI",
    title: "SiteBizAI — аудит сайта за 30 секунд",
    description: "Найдём ошибки в UX, SEO и конверсии. Дадим конкретный план улучшений и точки роста.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "SiteBizAI — аудит сайта за 30 секунд",
    description: "Найдём ошибки в UX, SEO и конверсии. Дадим конкретный план улучшений и точки роста.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=108548080', 'ym');

            ym(108548080, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>

        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/108548080"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>

        {children}
      </body>
    </html>
  );
}
