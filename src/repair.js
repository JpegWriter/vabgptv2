import OpenAI from 'openai';
export async function repairDraft({ apiKey, model, draft, issues, brief, context }){
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: model || 'gpt-4o',
    temperature: 0.3,
    messages: [
      { role:'system', content:'You are a surgical editor that only fixes listed issues.' },
      { role:'user', content: JSON.stringify({ draft, issues, brief, context }) }
    ]
  });
  return res.choices[0].message.content.trim();
}
