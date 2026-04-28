const FALLBACK_COUNTER_ID = 108548080;
const parsedCounterId = Number(import.meta.env.VITE_YM_ID);

export const METRIKA_COUNTER_ID = Number.isFinite(parsedCounterId) && parsedCounterId > 0
  ? parsedCounterId
  : FALLBACK_COUNTER_ID;

export function initMetrika() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const scriptSrc = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_COUNTER_ID}`;
  const hasMetrikaScript = Array.from(document.scripts).some((script) => script.src === scriptSrc);

  window.ym =
    window.ym ||
    function (...args) {
      (window.ym.a = window.ym.a || []).push(args);
    };
  window.ym.l = 1 * new Date();

  if (!hasMetrikaScript) {
    const tagScript = document.createElement("script");
    tagScript.async = true;
    tagScript.src = scriptSrc;
    document.head.appendChild(tagScript);
  }

  window.ym(METRIKA_COUNTER_ID, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
}

export function reachMetrikaGoal(goalName) {
  if (typeof window === "undefined" || !goalName) {
    return;
  }

  try {
    window.ym?.(METRIKA_COUNTER_ID, "reachGoal", goalName);
  } catch {
    // Tracking should never block user actions.
  }
}
