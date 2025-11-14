export type Sentiment = "positive" | "neutral" | "negative";
export type InterestLevel = "High" | "Medium" | "Low";

export interface Idea {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  sentiment: Sentiment;
  interest: InterestLevel;
  score: number;
  approved: boolean;
}

export interface ScriptVersion {
  id: string;
  timestamp: string;
  author: string;
  label: string;
  content: string;
}

export interface PromptRow {
  id: string;
  line: string;
  prompt: string;
}

export interface VideoClip {
  id: string;
  line: string;
  prompt: string;
  videoUrl: string;
  thumbnailUrl: string;
  status: "rendering" | "ready" | "error";
  start: number;
  end: number;
  duration: number;
}

export type StageKey = "idea" | "script" | "broll" | "video";

export type StageStatus = "not_started" | "in_progress" | "completed";

export type StageProgressState = Record<StageKey, StageStatus>;
