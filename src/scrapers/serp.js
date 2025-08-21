import fetch from 'node-fetch';
import { backoffFetch } from '../net.js';

/**
 * SERP research via API providers (Serper.dev or Tavily). Choose whichever key you have.
 * Returns related questions (PAA-style), related searches, and top result snippets.
 */
export async function serpResearch({ query, gl='us', hl='en', serperKey=process.env.SERPER_API_KEY, tavilyKey=process.env.TAVILY_API_KEY }){
  try{
    if (serperKey){
      const res = await backoffFetch('https://google.serper.dev/search', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-API-KEY': serperKey },
        body: JSON.stringify({ q: query, gl, hl, num: 10 })
      });
      if(!res.ok) throw new Error('serper error '+res.status);
      const data = await res.json();
      const paa = (data.peopleAlsoAsk||[]).map(x=>({ question:x.question, answer:x.snippet||'' }));
      const related = (data.relatedSearches||[]).map(x=>x.query);
      const snippets = (data.organic||[]).map(x=>({ title:x.title, snippet:x.snippet, link:x.link }));
      return { provider:'serper', paa, related, snippets };
    }
    if (tavilyKey){
      const res = await backoffFetch('https://api.tavily.com/search', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-API-Key': tavilyKey },
        body: JSON.stringify({ query, include_answer: false, max_results: 10 })
      });
      if(!res.ok) throw new Error('tavily error '+res.status);
      const data = await res.json();
      const snippets = (data.results||[]).map(r=>({ title:r.title, snippet:r.content?.slice(0,280)||'', link:r.url }));
      return { provider:'tavily', paa:[], related:[], snippets };
    }
    return { provider:'none', paa:[], related:[], snippets:[] };
  }catch(e){
    return { provider:'error', paa:[], related:[], snippets:[], error: e.message };
  }
}
