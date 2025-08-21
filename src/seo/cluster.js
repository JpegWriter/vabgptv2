import OpenAI from 'openai';

/**
 * Clusters related keywords into 3–6 topical groups and proposes H2s/FAQs.
 */
export async function clusterKeywords({ apiKey, model='gpt-4o-mini', seed, related=[], snippets=[] }){
  const client = new OpenAI({ apiKey });
  const prompt = {
    role: 'user',
    content: JSON.stringify({
      task: "Cluster keywords and propose H2 and FAQ seeds for a blog post.",
      seed, related, snippets
    })
  };
  const sys = { role: 'system', content:
`You are an SEO strategist. Group terms into 3–6 coherent clusters.
For each cluster, provide:
- name
- 3–6 keywords
- 1 suggested H2 (<=8 words)
- 2–3 FAQ questions (<=12 words). Return strict JSON.`
  };
  const res = await client.chat.completions.create({
    model, temperature: 0.2, messages: [sys, prompt], response_format: { type: "json_object" }
  });
  try{
    const data = JSON.parse(res.choices[0].message.content);
    return data;
  }catch{
    return { clusters: [] };
  }
}
