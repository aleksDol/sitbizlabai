import { fetchBusinessContextAnalysis, fetchOpenAiAnalysis } from "./openai-analysis.service.js";
import { fetchPageSpeedMetrics } from "./pagespeed.service.js";
import { parseWebsite } from "./site-parser.service.js";

export async function analyzeSite(urlObject, analysisInput = null) {
  // 1) Always parse the website itself first. This is the core result.
  const parsedData = await parseWebsite(urlObject);

  // 2) Additional enrichments are soft-dependencies with graceful fallback.
  const pageSpeedResult = await fetchPageSpeedMetrics(urlObject.href);

  const siteData = {
    ...parsedData,
    businessContext: analysisInput
      ? {
          niche: analysisInput.niche || "",
          hasWebsite: analysisInput.hasWebsite === true,
          channels: Array.isArray(analysisInput.channels) ? analysisInput.channels : [],
          hasRepeatSales: analysisInput.hasRepeatSales || "",
          leadsPerMonth: analysisInput.leadsPerMonth || ""
        }
      : null,
    performance_score: pageSpeedResult.metrics.performance_score,
    LCP: pageSpeedResult.metrics.LCP,
    FCP: pageSpeedResult.metrics.FCP,
    analyzedAt: new Date().toISOString()
  };

  const openAiResult = await fetchOpenAiAnalysis(siteData);
  const warnings = [pageSpeedResult.warning, openAiResult.warning].filter(Boolean);

  return {
    ...siteData,
    analysis: openAiResult.text,
    warnings
  };
}

export async function analyzeBusinessWithoutWebsite(analysisInput) {
  const openAiResult = await fetchBusinessContextAnalysis(analysisInput);

  return {
    analyzedAt: new Date().toISOString(),
    analysis: openAiResult.text,
    warnings: [openAiResult.warning].filter(Boolean)
  };
}
