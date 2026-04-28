import Link from "next/link";
import styles from "./home.module.css";

type HeroProps = {
  productUrl?: string;
};

export function Hero({ productUrl }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBadges}>
        <span className={styles.badge}>1 РјРёРЅСѓС‚Р°</span>
        <span className={styles.badge}>РЎР»Р°Р±С‹Рµ РјРµСЃС‚Р°</span>
        <span className={styles.badge}>РџРѕС‚РµСЂРё РґРµРЅРµРі</span>
      </div>

      <h1 className={styles.heroTitle}>РђРЅР°Р»РёР· СЃР°Р№С‚Р°, РєРѕС‚РѕСЂС‹Р№ РїРѕРєР°Р·С‹РІР°РµС‚, РіРґРµ РІС‹ С‚РµСЂСЏРµС‚Рµ РґРµРЅСЊРіРё</h1>

      <p className={styles.heroLead}>
        Р—Р° 1 РјРёРЅСѓС‚Сѓ РїРѕР»СѓС‡РёС‚Рµ СЂР°Р·Р±РѕСЂ СЃР°Р№С‚Р°: СЃР»Р°Р±С‹Рµ РјРµСЃС‚Р°, РїРѕС‚РµСЂРё Рё РїР»Р°РЅ, РєР°Рє СѓРІРµР»РёС‡РёС‚СЊ Р·Р°СЏРІРєРё
      </p>

      <div className={styles.actions}>
        <Link className={styles.buttonPrimary} href="/analyzer" onClick={() => window.ym?.(108548080, "reachGoal", "go_to_analyzer_from_home")}>
          РџСЂРѕРІРµСЂРёС‚СЊ СЃР°Р№С‚
        </Link>
        {productUrl ? (
          <Link className={styles.buttonSecondary} href={productUrl}>
            РџРµСЂРµР№С‚Рё РІ РїСЂРѕРґСѓРєС‚
          </Link>
        ) : (
          <Link className={styles.buttonSecondary} href="/blog">
            Р§РёС‚Р°С‚СЊ Р±Р»РѕРі
          </Link>
        )}
        <Link className={styles.mutedLink} href="/blog">
          РџСЂРёРјРµСЂС‹ Рё СЂР°Р·Р±РѕСЂС‹ в†’
        </Link>
      </div>
    </section>
  );
}


