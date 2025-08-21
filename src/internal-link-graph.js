/**
 * Build a light-weight internal link "graph" from crawled pages.
 * Produces a map of url -> { title, terms } where terms are normalized tokens.
 * Also exports a function to choose the best internal link for a draft by cosine similarity.
 */
function tokenize(text=''){
  return (text.toLowerCase().match(/[a-z\u00C0-\u024F]{3,}/g)||[]).slice(0, 3000);
}
function termFreq(tokens){
  const m = new Map(); tokens.forEach(t=>m.set(t,(m.get(t)||0)+1)); return m;
}
function cosine(a,b){
  let sum=0, na=0, nb=0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys){
    const va = a.get(k)||0, vb = b.get(k)||0;
    sum += va*vb; na += va*va; nb += vb*vb;
  }
  return sum / (Math.sqrt(na||1) * Math.sqrt(nb||1));
}
export function buildLinkGraph(pages=[]){
  const graph = new Map();
  for (const p of (pages||[])){
    const tokens = tokenize((p.title||'') + ' ' + (p.text||''));
    graph.set(p.url, { title: p.title||p.url, tf: termFreq(tokens) });
  }
  return graph;
}
export function pickBestInternalLink({ markdown, internalLinks=[], graph=null, siteDomain }){
  if (!internalLinks.length) return null;
  const bodyTokens = tokenize(markdown||'');
  const bodyTf = termFreq(bodyTokens);
  let best = null, bestScore = 0;
  for (const link of internalLinks){
    let score = 0;
    if (graph && graph.has(link.url)){
      score = cosine(bodyTf, graph.get(link.url).tf);
    }else{
      const anchorTf = termFreq(tokenize(link.anchor||''));
      score = cosine(bodyTf, anchorTf);
    }
    if (score > bestScore){ best = link; bestScore = score; }
  }
  return best || internalLinks[0];
}
