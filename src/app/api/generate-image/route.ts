import { NextResponse } from "next/server";

/**
 * Server-side image-generation endpoint.
 *
 * Provider-agnostic, OpenAI-compatible images API by default (OpenAI, or any
 * compatible gateway). Swap purely via env vars — no code change:
 *
 *   IMAGE_API_KEY    required to enable the route
 *   IMAGE_BASE_URL   defaults to https://api.openai.com/v1
 *   IMAGE_MODEL      defaults to gpt-image-1
 *
 * Returns the image as a base64 data URL so it embeds in the design state and
 * exports cleanly. The API key never reaches the browser.
 */
export async function POST(req: Request) {
  const apiKey = process.env.IMAGE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "No IMAGE_API_KEY configured. Use the mock image provider." },
      { status: 501 },
    );
  }

  let body: { prompt?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  const baseUrl = process.env.IMAGE_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.IMAGE_MODEL ?? "gpt-image-1";
  const size = pickSize(body.size);

  try {
    const upstream = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        n: 1,
        // Request base64 so we can embed it directly.
        response_format: "b64_json",
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `Upstream image error: ${text || upstream.status}` },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    const item = data?.data?.[0];
    const src = item?.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item?.url;

    if (!src) {
      return NextResponse.json(
        { error: "Image provider returned no image." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      src,
      label: prompt.split(/\s+/).slice(0, 3).join(" "),
      provider: "remote",
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Request failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

/** Clamp to the common square sizes most image APIs accept. */
function pickSize(size?: number): string {
  if (!size || size <= 512) return "512x512";
  if (size <= 768) return "768x768";
  return "1024x1024";
}
