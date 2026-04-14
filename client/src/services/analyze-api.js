import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000"
});

export async function analyzeWebsite(url) {
  const response = await api.post("/analyze", { url });
  return response.data;
}

export async function estimateBusinessLosses(analysisProblems) {
  const response = await api.post("/analyze/losses", { analysisProblems });
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
