import { NextResponse } from "next/server";

const sampleClips = [
  {
    url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
    thumbnail: "https://storage.googleapis.com/coverr-public/thumbnails/Mt_Baker.jpg",
    duration: 12,
  },
  {
    url: "https://storage.googleapis.com/coverr-main/mp4/Northern_Lights.mp4",
    thumbnail: "https://storage.googleapis.com/coverr-public/thumbnails/Northern_Lights.jpg",
    duration: 16,
  },
  {
    url: "https://storage.googleapis.com/coverr-main/mp4/Singing_in_the_Rain.mp4",
    thumbnail: "https://storage.googleapis.com/coverr-public/thumbnails/Singing_in_the_Rain.jpg",
    duration: 10,
  },
  {
    url: "https://storage.googleapis.com/coverr-main/mp4/Take_Me_To_Church.mp4",
    thumbnail: "https://storage.googleapis.com/coverr-public/thumbnails/Take_Me_To_Church.jpg",
    duration: 18,
  },
];

type VideoRequest = {
  prompt: string;
  line: string;
  apiKey?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VideoRequest;
    const { prompt, line, apiKey } = body;

    if (!prompt || !line) {
      return NextResponse.json(
        { error: "Prompt and script line are required." },
        { status: 400 },
      );
    }

    if (!apiKey) {
      // Informational only — allows UI to warn user.
      console.warn("Qwen API key not provided; returning placeholder clip.");
    }

    const clip = sampleClips[Math.floor(Math.random() * sampleClips.length)];

    return NextResponse.json({
      clip: {
        videoUrl: clip.url,
        thumbnailUrl: clip.thumbnail,
        duration: clip.duration,
        prompt,
        line,
      },
    });
  } catch (error) {
    console.error("Video generation failed", error);
    return NextResponse.json(
      { error: "Unable to generate video clip." },
      { status: 500 },
    );
  }
}
