import fetch from 'node-fetch';
export async function buildContextPackets({ url, brand, services=[], region={}, proofs={}, internalLinks=[] }){
  const locality = deriveLocality(region);
  const page = url ? await safeFetch(url) : '';
  const servicesNorm = normalizeServices(services);
  const voice = learnVoice(page || brand || '');
  const proofsNorm = normalizeProofs(proofs);
  const internals = internalLinks.length ? internalLinks : [];
  return { locality, services: servicesNorm, proofs: proofsNorm, voice, internalLinks: internals, rawPage: page?.slice(0, 50000) || '' };
}
async function safeFetch(url){
  try{ const res = await fetch(url, { timeout: 10000 });
    if(!res.ok) return ''; const text = await res.text();
    return text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  }catch(e){ return ''; }
}
function deriveLocality(region){
  return { city: region?.city || 'Your City', neighborhoods: region?.neighborhoods || [], nearby: region?.nearby || [], locale: region?.locale || 'en-US' };
}
function normalizeServices(list){
  if (!Array.isArray(list) || list.length===0) {
    return [ { name:'Family Photography', benefits:['posed + candid','studio or outdoor']},
             { name:'Newborn Photography', benefits:['safety-led','warm studio','macro details']},
             { name:'Maternity Photography', benefits:['flattering light','wardrobe options']} ];
  }
  return list.map(s => typeof s === 'string' ? { name:s, benefits:[] } : s);
}
function learnVoice(text){
  const tokens = (text||'').toLowerCase().match(/[a-z]+/gi) || [];
  const bigrams = new Map();
  for (let i=0;i<tokens.length-1;i++){ const k = tokens[i]+' '+tokens[i+1]; bigrams.set(k, (bigrams.get(k)||0)+1); }
  const rare = [...bigrams.entries()].sort((a,b)=>a[1]-b[1]).slice(0,10).map(v=>v[0]);
  return { rareTerms: rare, cadence: 'human', tabooPhrases: ['capture timeless','in today\'s digital age'] };
}
function normalizeProofs(proofs){ return { rnOnSet: !!proofs.rnOnSet, awards: proofs.awards || [], rating: proofs.rating || undefined, years: proofs.years || undefined }; }


export function mergeResearch(context, scraped){
  const out = { ...context };
  // PAA → add to voice cues and FAQ seeds
  const paa = scraped?.serp?.paa || [];
  if (paa.length){
    out.faqSeeds = paa.map(x=>x.question);
  }
  // related searches → secondary terms
  const related = scraped?.serp?.related || [];
  if (related.length){
    out.relatedTerms = related.slice(0,10);
  }
  // snippets → competitor hints
  const snippets = scraped?.serp?.snippets || [];
  if (snippets.length){
    out.topSnippets = snippets.slice(0,10);
  }
  // social signals
  if (scraped?.social?.items?.length){
    out.socialSignals = scraped.social.items;
  }
  // reviews
  if (scraped?.reviews){
    out.proofs = { ...(out.proofs||{}), rating: scraped.reviews.ratingAvg || out.proofs?.rating };
    out.reviewTerms = scraped.reviews.topTerms || [];
  }
  return out;
}


export function mergeVision(context, vision){
  if (!vision) return context;
  const out = { ...context };
  if (vision.items?.length){
    out.visualNotes = vision.items.slice(0, 20);
  }
  if (vision.tags?.length){
    out.visualTags = vision.tags.slice(0, 12);
  }
  return out;
}


export function mergeCrawl(context, crawl){
  if (!crawl) return context;
  const out = { ...context };
  if (Array.isArray(crawl.pages) && crawl.pages.length){
    const bigText = crawl.pages.map(p=>p.text).join(' ').toLowerCase();
    // Derive extra services by URL titles
    const extraServices = crawl.pages.slice(0,5).map(p=>({ name: p.title.slice(0,60) }));
    out.services = dedupeByName([...(out.services||[]), ...extraServices]);
  }
  if (Array.isArray(crawl.internalLinks) && crawl.internalLinks.length){
    // Only add if user did not provide any
    if (!out.internalLinks || out.internalLinks.length===0){
      out.internalLinks = crawl.internalLinks.map(({anchor,url})=>({anchor,url}));
    }
  }
  out.crawledPages = crawl.pages?.slice(0, maxLen(10)) || [];
  return out;
}

export function mergeClusters(context, clusters){
  const out = { ...context };
  const list = clusters?.clusters || [];
  out.clusters = list;
  out.h2Seeds = list.map(c=>c.h2).filter(Boolean);
  out.faqSeeds = [...new Set([...(out.faqSeeds||[]), ...list.flatMap(c=>c.faqs||[])])].slice(0,12);
  return out;
}

function dedupeByName(arr){
  const seen = new Set();
  return (arr||[]).filter(x=>{
    const k = (x.name||'').toLowerCase();
    if (seen.has(k) || !k) return false;
    seen.add(k); return true;
  });
}
function maxLen(n){ return n; }
