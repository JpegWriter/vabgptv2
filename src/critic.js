export function criticCheck(md, brief, ctx){
  const issues = [];
  const kp = (brief.primary_keyphrase || '').toLowerCase();
  const lc = (md || '').toLowerCase();
  if (!/^#\s+.+/m.test(md)) issues.push('Missing H1.');
  const words = (md.match(/\S+/g) || []).length;
  const count = (lc.match(new RegExp(`\\b${escapeReg(kp)}\\b`, 'g')) || []).length;
  const density = count / Math.max(300, words);
  if (count < 3) issues.push('Primary keyphrase appears too few times.');
  if (density < 0.01) issues.push('Keyphrase density too low.');
  const city = (ctx.locality?.city || '').toLowerCase();
  if (city && !new RegExp(`#\# .*${escapeReg(city)}`).test(lc)) issues.push('No geo mention in H2s.');
  if (!/\n###?\s*Answer Box/i.test(md)) issues.push('Missing Answer Box.');
  if (!/##\s*FAQs/i.test(md)) issues.push('Missing FAQs.');
  const faqCount = (md.match(/\n\*\*/g) || []).length;
  if (faqCount < 8) issues.push('FAQs too thin (need ≥4 Q&A).');
  if (!/\|\s*Comparison/i.test(md)) issues.push('Missing comparison table.');
  if (!/##\s*Checklist/i.test(md)) issues.push('Missing checklist.');
  const externals = [...md.matchAll(/\]\((https?:\/\/[^\)]+)\)/g)].map(m=>m[1]);
  if (externals.length < 1) issues.push('Need one outbound link.');
  if (!/\]\(\//.test(md)) issues.push('Need at least one internal link.');
  const banned = /(capture timeless memories|digital age|safe and comfortable environment|tailored to your needs)/i;
  if (banned.test(lc)) issues.push('Boilerplate language present.');
  const hero = (md.match(/\[IMG:hero\]/g) || []).length;
  if (hero !== 1) issues.push('Exactly one [IMG:hero] required.');
  return issues;
}
function escapeReg(s){return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
