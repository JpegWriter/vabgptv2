import fetch from 'node-fetch';
import { backoffFetch } from '../net.js';

/**
 * Lightweight social "scraper" that expects public JSON adapters or simple HTML fetch.
 * For production, prefer official APIs or a service like Apify for Instagram/FB.
 * Here we accept a list of profile/page URLs and try to extract recent captions/blurbs.
 */
export async function socialHints({ urls=[] }){
  const items = [];
  for (const url of urls.slice(0,5)){
    try{
      const res = await backoffFetch(url, { timeout: 8000 });
      if(!res.ok) continue;
      const html = await res.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
      // crude extraction: look for short lines with hashtags or emoji as tone clues
      const matches = text.match(/[#@][\wäöüß-]{2,}|\p{Emoji}/gu) || [];
      items.push({ url, signals: matches.slice(0,30) });
    }catch(e){ /* ignore */ }
  }
  return { items };
}
