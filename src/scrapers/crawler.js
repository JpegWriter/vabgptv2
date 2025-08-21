import { withBackoff } from '../utils-backoff.js';
import fetch from 'node-fetch';
import { backoffFetch } from '../net.js';

/**
 * Simple same-domain crawler with breadth-first traversal.
 * - Respects maxPages and optional allowPaths patterns
 * - Strips HTML to text; extracts <title> and internal links
 * - Returns pages[] and internalLinks[] candidates
 */
export async function crawlSite({ baseUrl, startPath='/', maxPages=5, allowPaths=[] }){
  const origin = new URL(baseUrl).origin;
  const queue = [ new URL(startPath, origin).toString() ];
  const visited = new Set();
  const pages = [];
  const linkCounts = new Map();

  while (queue.length && pages.length < maxPages){
    const url = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);

    // path filter
    const u = new URL(url);
    if (allowPaths.length && !allowPaths.some(p => u.pathname.startsWith(p))) continue;

    try{
      const res = await backoffFetch(url, { timeout: 10000, redirect: 'follow' });
      if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) continue;
      const html = await res.text();
      const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim() || u.pathname;
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi,' ')
        .replace(/<style[\s\S]*?<\/style>/gi,' ')
        .replace(/<[^>]+>/g,' ')
        .replace(/\s+/g,' ')
        .trim();

      pages.push({ url, title, text });

      // collect internal links
      const links = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
      for (const href of links){
        let abs;
        try { abs = new URL(href, origin).toString(); } catch { continue; }
        if (!abs.startsWith(origin)) continue;
        const ap = new URL(abs).pathname;
        if (allowPaths.length && !allowPaths.some(p => ap.startsWith(p))) continue;
        if (!visited.has(abs)) queue.push(abs);
        linkCounts.set(abs, (linkCounts.get(abs)||0)+1);
      }
    }catch(e){ /* ignore network errors */ }
  }

  const internalLinks = [...linkCounts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0, 10)
    .map(([url, score]) => ({ anchor: guessAnchorFromUrl(url), url, score }));

  return { pages, internalLinks };
}

function guessAnchorFromUrl(url){
  try{
    const p = new URL(url).pathname.replace(/\/$/,'').split('/').pop() || 'Learn more';
    return decodeURIComponent(p).replace(/[-_]+/g,' ').replace(/\b\w/g, c=>c.toUpperCase()) || 'Learn more';
  }catch{ return 'Learn more'; }
}
