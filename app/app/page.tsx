import { Benefits } from "@/components/home/Benefits";
import { CTA } from "@/components/home/CTA";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Trust } from "@/components/home/Trust";
import styles from "@/components/home/home.module.css";

export default function Home() {
  const productUrl = process.env.NEXT_PUBLIC_PRODUCT_URL;

  return (
    <main className={styles.page}>
      <Hero productUrl={productUrl} />
      <HowItWorks />
      <Benefits />
      <Trust />
      <CTA />
    </main>
  );
}
