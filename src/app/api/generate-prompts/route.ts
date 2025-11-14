import { NextResponse } from "next/server";

type PromptRequest = {
  lines: string[];
  aesthetic?: string;
};

const descriptors = [
  "cinematic",
  "moody lighting",
  "dynamic movement",
  "ultra high definition",
  "documentary feel",
  "macro detail",
  "wide aerial perspective",
  "studio-grade lighting",
  "volumetric lighting",
  "slow-motion",
];

function buildPrompt(line: string): string {
  const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
  return `${descriptor} b-roll illustrating: ${line}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PromptRequest;
    const { lines, aesthetic } = body;

    if (!lines?.length) {
      return NextResponse.json(
        { error: "No script lines provided." },
        { status: 400 },
      );
    }

    const prompts = lines.map((line) => {
      const base = buildPrompt(line);
      return aesthetic ? `${base} — aesthetics: ${aesthetic}` : base;
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Prompt generation failed", error);
    return NextResponse.json(
      { error: "Unable to generate prompts." },
      { status: 500 },
    );
  }
}
