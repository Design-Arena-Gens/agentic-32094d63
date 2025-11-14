import type { InterestLevel, Sentiment } from "@/types";

const positiveKeywords = [
  "growth",
  "surge",
  "win",
  "record",
  "innovation",
  "funding",
  "breakthrough",
  "award",
];

const negativeKeywords = [
  "loss",
  "drop",
  "crisis",
  "lawsuit",
  "decline",
  "breach",
  "concern",
  "warning",
  "controversy",
];

export function analyzeSentiment(text: string): Sentiment {
  const normalized = text.toLowerCase();
  const positiveHits = positiveKeywords.filter((word) =>
    normalized.includes(word),
  ).length;
  const negativeHits = negativeKeywords.filter((word) =>
    normalized.includes(word),
  ).length;

  if (positiveHits === negativeHits) return "neutral";
  return positiveHits > negativeHits ? "positive" : "negative";
}

export function mapInterest(score: number): InterestLevel {
  if (score >= 150) return "High";
  if (score >= 75) return "Medium";
  return "Low";
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
  });
}
