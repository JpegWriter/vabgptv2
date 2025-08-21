import OpenAI from 'openai';

export async function generateOutline({ apiKey, model='gpt-4o-mini', brief, context }){
  const client = new OpenAI({ apiKey });
  const sys = { role:'system', content: `You are an elite SEO content strategist. Return STRICT JSON.` };
  const user = { role:'user', content: JSON.stringify({
    task: "Create an outline for a blog post.",
    constraints: {
      keyphrase: brief.primary_keyphrase,
      city: brief.region.city,
      aeo: { answerBox: true, faqs: Math.max(4, brief.aeo?.faqs||4), checklist: true, comparison: true },
      clusters: context.clusters || null
    },
    want: {
      wordCount: 1200,
      h2s: "3-6 high quality sections with short titles",
      includeGeo: true
    }
  })};
  const res = await client.chat.completions.create({
    model, temperature: 0.2, messages: [sys, user], response_format: { type: "json_object" }
  });
  try{ return JSON.parse(res.choices[0].message.content); }catch{ return { h2: [] }; }
}

export async function generateDraftFromOutline({ apiKey, model='gpt-4o', brief, context, outline }){
  const client = new OpenAI({ apiKey });
  const MASTER = `Write MARKDOWN using this outline. HARD REQUIREMENTS:
- Use PRIMARY KEYPHRASE in SEO Title, H1, 1–2 H2s.
- Include city and locality cues.
- Include exactly ONE outbound link and at least ONE internal link (use provided list).
- Include AEO blocks: Answer Box, FAQs (>=4), Checklist, Comparison Table.
- One image token [IMG:hero] at top, up to two additional [IMG:img_x].
Avoid boilerplate; use concrete photography details.`;
  const messages = [
    { role:'system', content: MASTER },
    { role:'user', content: JSON.stringify({ brief, context, outline }) }
  ];
  const res = await client.chat.completions.create({
    model, temperature: 0.7, top_p: 0.9, presence_penalty: 0.4, messages
  });
  return res.choices[0].message.content.trim();
}
