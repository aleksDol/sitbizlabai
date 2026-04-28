const PLATFORM_RULES = [
  {
    platform: "Tilda",
    patterns: ["tildacdn.com", "tilda-blocks"]
  },
  {
    platform: "WordPress",
    patterns: ["wp-content", "wp-includes"]
  },
  {
    platform: "Bitrix",
    patterns: ["bitrix/js", "bx.message"]
  },
  {
    platform: "Wix",
    patterns: ["wixstatic.com"]
  },
  {
    platform: "Webflow",
    patterns: ["webflow.js", "data-wf-page"]
  },
  {
    platform: "Shopify",
    patterns: ["cdn.shopify.com"]
  }
];

function getConfidence(matchCount) {
  if (matchCount >= 2) {
    return "high";
  }

  if (matchCount === 1) {
    return "medium";
  }

  return "low";
}

export function detectPlatform(html) {
  const source = typeof html === "string" ? html.toLowerCase() : "";

  if (!source) {
    return {
      platform: "unknown",
      confidence: "low",
      signals: []
    };
  }

  let bestMatch = {
    platform: "unknown",
    confidence: "low",
    signals: [],
    score: 0
  };

  for (const rule of PLATFORM_RULES) {
    const signals = rule.patterns.filter((pattern) => source.includes(pattern));
    const score = signals.length;

    if (score > bestMatch.score) {
      bestMatch = {
        platform: rule.platform,
        confidence: getConfidence(score),
        signals,
        score
      };
    }
  }

  return {
    platform: bestMatch.platform,
    confidence: bestMatch.confidence,
    signals: bestMatch.signals
  };
}
