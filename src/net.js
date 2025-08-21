let lastCall = 0;

/**
 * backoffFetch - wraps fetch with exponential backoff + jitter and optional rate-limit delay.
 * @param {string} url
 * @param {object} opts
 * @param {number} retries - max retries
 * @param {number} baseDelay - base delay in ms (exponential backoff)
 * @param {number} rateLimitDelay - delay between calls to avoid hammering providers
 */
export async function backoffFetch(url, opts={}, { retries=3, baseDelay=300, rateLimitDelay=Number(process.env.RATE_LIMIT_DELAY_MS||'200') }={}){
  const fetchFn = (await import('node-fetch')).default;
  let attempt = 0;
  while (true){
    // simple global rate limiter (single-process)
    const now = Date.now();
    const wait = Math.max(0, lastCall + rateLimitDelay - now);
    if (wait) await sleep(wait);
    lastCall = Date.now();

    try{
      const res = await fetchFn(url, opts);
      if (res.status === 429 && attempt < retries){
        const retryAfter = Number(res.headers.get('retry-after') || 0) * 1000;
        const delay = Math.max(retryAfter, jitter(baseDelay * Math.pow(2, attempt)));
        await sleep(delay);
        attempt++;
        continue;
      }
      if (!res.ok && attempt < retries){
        const delay = jitter(baseDelay * Math.pow(2, attempt));
        await sleep(delay);
        attempt++;
        continue;
      }
      return res;
    }catch(e){
      if (attempt >= retries) throw e;
      const delay = jitter(baseDelay * Math.pow(2, attempt));
      await sleep(delay);
      attempt++;
    }
  }
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function jitter(ms){ const j = Math.random() * 0.3 + 0.85; return Math.floor(ms * j); }
