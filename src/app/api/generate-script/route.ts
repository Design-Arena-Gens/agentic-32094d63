import { NextResponse } from "next/server";
import { formatTimestamp } from "@/lib/analysis";
import type { Idea } from "@/types";

type ScriptRequest = {
  model: string;
  ideas: Idea[];
  tone?: string;
  callToAction?: string;
  audience?: string;
};

function buildHook(idea: Idea): string {
  return `What if ${idea.title.toLowerCase()} could change the way we think about ${idea.source.replace(/\..*/, "")}?`;
}

function buildSections(ideas: Idea[], tone: string): string {
  return ideas
    .map((idea, index) => {
      const hook = index === 0 ? buildHook(idea) : `Next, ${idea.title}.`;
      return `${hook}\n${idea.summary}\nNarrative tone: Keep delivery ${tone}.\nMomentum: This story is seeing ${idea.interest.toLowerCase()} audience engagement with ${idea.score} discussion points.`;
    })
    .join("\n\n");
}

export async function POST(request: Request) {
  const now = new Date();

  try {
    const body = (await request.json()) as ScriptRequest;
    const { model, ideas, tone = "informative", callToAction, audience } = body;

    if (!ideas?.length) {
      return NextResponse.json(
        { error: "At least one approved idea is required." },
        { status: 400 },
      );
    }

    const sanitizedModel = model?.trim() || "model-not-specified";
    const intro = `// generated via ${sanitizedModel} on ${formatTimestamp(now)}\n`;

    const audienceLine = audience
      ? `Audience focus: ${audience}.`
      : "Audience focus: General interest viewers.";
    const toneLine = `Tone direction: ${tone}.`;

    const sections = buildSections(ideas, tone);

    const outro = callToAction
      ? `Call to action: ${callToAction}.`
      : "Call to action: Encourage viewers to share and subscribe for more trend breakdowns.";

    const script = `${intro}${audienceLine}\n${toneLine}\n\n[Hook]\n${buildHook(
      ideas[0],
    )}\n\n[Body]\n${sections}\n\n[Outro]\n${outro}`;

    return NextResponse.json({ script });
  } catch (error) {
    console.error("Script generation failed", error);
    return NextResponse.json(
      { error: "Unable to generate script. Please try again." },
      { status: 500 },
    );
  }
}
