import { NextResponse } from "next/server";
import { analyzeSentiment, mapInterest } from "@/lib/analysis";
import type { Idea } from "@/types";

type HNHit = {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  story_text: string | null;
  _highlightResult?: {
    title?: {
      value: string;
    };
  };
};

type HNResponse = {
  hits: HNHit[];
};

function buildSummary(hit: HNHit): string {
  if (hit.story_text) {
    const sanitized = hit.story_text
      .replace(/\s+/g, " ")
      .replace(/\<[^>]*\>/g, "")
      .trim();
    if (sanitized.length > 240) {
      return `${sanitized.slice(0, 237)}...`;
    }
    return sanitized;
  }

  if (hit._highlightResult?.title?.value) {
    return hit._highlightResult.title.value.replace(/<[^>]+>/g, "");
  }

  return `Trending story about ${hit.title}`;
}

function detectSource(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return "news.ycombinator.com";
  }
}

export async function GET() {
  try {
    const response = await fetch(
      "https://hn.algolia.com/api/v1/search?tags=front_page",
      {
        headers: {
          "User-Agent": "agentic-video-studio/1.0",
        },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      throw new Error(`Trending news fetch failed with ${response.status}`);
    }

    const payload = (await response.json()) as HNResponse;

    const ideas: Idea[] = payload.hits.slice(0, 12).map((hit) => {
      const url =
        hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;
      return {
        id: hit.objectID,
        title: hit.title,
        summary: buildSummary(hit),
        url,
        source: detectSource(url),
        sentiment: analyzeSentiment(`${hit.title} ${hit.story_text ?? ""}`),
        interest: mapInterest(hit.points ?? 0),
        score: hit.points ?? 0,
        approved: false,
      };
    });

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Trending news failure", error);
    return NextResponse.json(
      {
        ideas: [],
        error: "Unable to load trending stories. Try again later.",
      },
      { status: 500 },
    );
  }
}
