import Link from "next/link";
import styles from "./home.module.css";

export function CTA() {
  return (
    <section className={styles.section} aria-labelledby="cta-title" id="cta">
      <div>
        <p className={styles.kicker}>Р¤РёРЅР°Р»СЊРЅС‹Р№ С€Р°Рі</p>
        <h2 className={styles.h2} id="cta-title">
          РџСЂРѕРІРµСЂСЊС‚Рµ СЃРІРѕР№ СЃР°Р№С‚ Рё РїРѕСЃРјРѕС‚СЂРёС‚Рµ, РіРґРµ РІС‹ С‚РµСЂСЏРµС‚Рµ РєР»РёРµРЅС‚РѕРІ
        </h2>
        <p className={styles.subheading}>РћС‚РєСЂРѕР№С‚Рµ Р°РЅР°Р»РёР·Р°С‚РѕСЂ вЂ” Рё РїРѕР»СѓС‡РёС‚Рµ РєРѕРЅРєСЂРµС‚РЅС‹Р№ РїР»Р°РЅ, С‡С‚Рѕ РёСЃРїСЂР°РІРёС‚СЊ.</p>
      </div>

      <div className={styles.ctaBox}>
        <div className={styles.ctaButtons}>
          <div className={styles.actions}>
            <Link className={styles.buttonPrimary} href="/analyzer" onClick={() => window.ym?.(108548080, "reachGoal", "go_to_analyzer_from_home")}>
              РќР°С‡Р°С‚СЊ Р°РЅР°Р»РёР·
            </Link>
            <Link className={styles.buttonSecondary} href="/blog">
              РџСЂРёРјРµСЂС‹ СЂР°Р·Р±РѕСЂРѕРІ
            </Link>
          </div>
          <span className={styles.helper}>РџРѕСЃР»Рµ РєР»РёРєР° РѕС‚РєСЂРѕРµС‚СЃСЏ Р°РЅР°Р»РёР·Р°С‚РѕСЂ. РќРёРєР°РєРёС… С„РѕСЂРј.</span>
        </div>
      </div>
    </section>
  );
}


