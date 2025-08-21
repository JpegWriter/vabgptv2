import OpenAI from 'openai';
const MASTER_WRITER_PROMPT = `
You are a senior brand copywriter for portrait studios anywhere in the world.
Write a fully formatted MARKDOWN blog post to be converted to HTML.

HARD REQUIREMENTS:
- Use the PRIMARY KEYPHRASE exactly; include it in: SEO Title, H1, 1–2 H2s, and naturally in body (~1–2%).
- Include locality signals (city + 2–3 neighborhoods or nearby areas when provided).
- Include ONE internal link (provided) and exactly ONE outbound authority link.
- Include AEO blocks: Answer Box (45–60 words), FAQs (≥4 Q&As), Checklist (5–7 bullets), Comparison Table (Markdown).
- Images: ONE [IMG:hero] at top, up to TWO inline [IMG:img_x].
- Never fabricate prices. Avoid boilerplate phrases.

STRUCTURE:
- SEO Title: ...
- Meta: ...
- Slug: /your-slug
- # H1
- Intro (≤80 words) ending with PRIMARY KEYPHRASE.
- [IMG:hero]
- H2/H3 sections with concrete details (lighting, lenses, session flow).
- AEO blocks: Answer Box, FAQs, Checklist, Comparison Table
- Conclusion with a single CTA and the internal link.
`;
export async function generateDraft({ apiKey, model, brief, context }){
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: model || 'gpt-4o',
    messages: [
      { role:'system', content: MASTER_WRITER_PROMPT },
      { role:'user', content: JSON.stringify({ brief, context /* may include visualNotes, visualTags */ }) }
    ],
    temperature: 0.7, top_p: 0.9, presence_penalty: 0.4
  });
  return res.choices[0].message.content.trim();
}
