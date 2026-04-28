import axios from "axios";

function getAnalyzerApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, "");
  }

  // Recommended production setup: same domain behind nginx at /analyzer-api
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/analyzer-api`;
  }

  // Fallback for local dev when no env is provided.
  return "http://localhost:5051";
}

const api = axios.create({
  baseURL: getAnalyzerApiBaseUrl()
});

export async function analyzeWebsite(url) {
  const response = await api.post("/analyze", { url });
  return response.data;
}

export async function analyzeBusiness(analysisInput) {
  const response = await api.post("/analyze", { analysisInput });
  return response.data;
}

export async function estimateBusinessLosses(analysisProblems, analysisInput = null) {
  const response = await api.post("/analyze/losses", { analysisProblems, analysisInput });
  return response.data;
}

export async function createSolutionOffer({
  analysisText,
  lossesText,
  siteType,
  hasRepeatSales,
  trafficSources
}) {
  const response = await api.post("/solution-offer", {
    analysisText,
    lossesText,
    siteType,
    hasRepeatSales,
    trafficSources
  });
  return response.data;
}
