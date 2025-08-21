import fs from 'fs/promises';

/**
 * Reviews adapter: either pass an array of review objects in the request,
 * or point to a local JSON file (uploaded) that contains [{rating, text}].
 * We compute simple aggregates and pull top distinct phrases.
 */
export async function reviewsDigest({ reviews=[], filePath=null }){
  try{
    if (!reviews.length && filePath){
      const raw = await fs.readFile(filePath, 'utf-8');
      reviews = JSON.parse(raw);
    }
  }catch(e){ /* ignore */ }

  const texts = (reviews||[]).map(r=>r.text||'').join(' ').toLowerCase();
  const tokens = texts.match(/[a-zäöüß]{3,}/gi) || [];
  const freq = new Map();
  tokens.forEach(t=>freq.set(t, (freq.get(t)||0)+1));
  const topTerms = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25).map(x=>x[0]);

  const ratingAvg = (reviews||[]).filter(r=>typeof r.rating==='number').reduce((a,b)=>a+b.rating,0) / Math.max(1,(reviews||[]).filter(r=>typeof r.rating==='number').length);

  return { ratingAvg: ratingAvg || null, topTerms, sample: (reviews||[]).slice(0,10) };
}
