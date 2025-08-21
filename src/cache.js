const store = new Map();

/**
 * Simple in-memory cache with TTL (ms). Not for multi-process.
 */
export function cacheGet(key){
  const item = store.get(key);
  if (!item) return null;
  if (item.exp && Date.now() > item.exp){ store.delete(key); return null; }
  return item.val;
}
export function cacheSet(key, val, ttlMs=24*60*60*1000){
  store.set(key, { val, exp: ttlMs ? Date.now() + ttlMs : 0 });
}
