export function suggestMissingTopics({ draftMd, h2Seeds=[], competitorSnippets=[] }){
  const lc = (draftMd||'').toLowerCase();
  const missing = [];
  for (const h2 of h2Seeds.slice(0,8)){
    const key = String(h2).toLowerCase().replace(/[^a-z0-9 ]/g,'');
    if (key && !lc.includes(key)){ missing.push(`Add H2 covering: ${h2}`); }
  }
  // Light check for competitor topics (n-grams from snippets)
  const topics = (competitorSnippets||[]).map(s => (s.title||'').toLowerCase()).filter(Boolean);
  for (const t of topics){
    if (t.length > 6 && !lc.includes(t)) missing.push(`Consider addressing competitor topic: "${t}"`);
  }
  return missing;
}
