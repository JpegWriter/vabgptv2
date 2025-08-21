import { withBackoff } from '../utils-backoff.js';
import { serpResearch } from './serp.js';
import { socialHints } from './social.js';
import { reviewsDigest } from './reviews.js';

export async function runScrapers({ research={}, region={}, social={}, reviews={} }){
  const out = {};

  if (research?.enableSERP && research?.query){
    out.serp = await serpResearch({ query: research.query, gl: region?.gl || 'us', hl: region?.hl || 'en' });
  }
  if (social?.enable && Array.isArray(social.urls)){
    out.social = await socialHints({ urls: social.urls });
  }
  if (reviews?.enable){
    out.reviews = await reviewsDigest({ reviews: reviews.list || [], filePath: reviews.filePath || null });
  }
  return out;
}


export { analyzeImages } from './vision.js';

export { crawlSite } from './crawler.js';
