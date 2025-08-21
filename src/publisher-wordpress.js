import fetch from 'node-fetch';
export async function publishToWordPress({ siteUrl, username, appPassword, title, html, canonical }){
  const endpoint = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
  const res = await fetch(endpoint, { method:'POST', headers:{ 'Authorization':`Basic ${auth}`, 'Content-Type':'application/json' }, body: JSON.stringify({ title, content: html, status:'draft', meta:{ canonical_url: canonical } }) });
  if (!res.ok){ const text = await res.text(); throw new Error(`WP publish failed: ${res.status} ${text}`); }
  return await res.json();
}
