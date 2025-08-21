import { z } from 'zod';
export const BriefSchema = z.object({
  brand: z.string().min(2),
  primary_keyphrase: z.string().min(2).max(60),
  region: z.object({ city: z.string().min(2), locale: z.string().min(2) }),
  services: z.array(z.object({ name: z.string(), benefits: z.array(z.string()).optional() })).min(1),
  internal_links: z.array(z.object({ anchor: z.string(), url: z.string().url() })).min(1),
  aeo: z.object({ faqs: z.number().min(4), comparison: z.boolean().refine(v=>v===true), checklist: z.boolean().refine(v=>v===true) })
});
export function assertBrief(brief){
  const res = BriefSchema.safeParse(brief);
  if (!res.success) { const issues = res.error.issues.map(i => `${i.path.join('.')} - ${i.message}`).join(' | '); throw new Error('INVALID_BRIEF: ' + issues); }
  if (/\$\s?\d|€\s?\d/.test(JSON.stringify(brief))) throw new Error('INVALID_BRIEF: pricing not allowed in brief');
  return res.data;
}
