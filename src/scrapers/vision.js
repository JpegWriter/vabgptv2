import OpenAI from 'openai';

/**
 * Vision analysis using OpenAI (gpt-4o / gpt-4o-mini).
 * Accepts image URLs or base64 data URLs.
 * Returns compact descriptors for style, lighting, location cues, and suggested tags.
 */
export async function analyzeImages({ apiKey, model='gpt-4o-mini', images=[] }){
  if (!apiKey || !images?.length) return { items: [], summary: null };

  const client = new OpenAI({ apiKey });

  // Build multi-part content for vision
  const visionContent = images.slice(0, 6).flatMap((src) => ({
    type: "input_image",
    image_url: src
  }));

  const system = `You are a senior photography editor.
For each image, extract: style (e.g., lifestyle/editorial/studio), lighting (e.g., natural/flash/rembrandt), props, mood, and location cues (park/studio/beach/city). 
Keep descriptions short and specific. Avoid guessing locations by name unless obvious.`;

  const user = [
    { type: "text", text: "Analyze each image and provide a bullet summary and 5–8 SEO tags total across images." },
    ...visionContent
  ];

  try{
    const res = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });
    const out = res.choices[0].message.content || "";
    // Very light parse: produce tags and lines
    const tags = Array.from(new Set((out.match(/#[a-z0-9\-]+/gi) || []).map(s => s.toLowerCase()))).slice(0, 12);
    const lines = out.split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 40);
    return { items: lines, tags, raw: out };
  }catch(e){
    return { items: [], tags: [], error: e.message };
  }
}
