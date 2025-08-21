import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Publish HTML to Ghost (Admin API).
 * Requirements:
 *  - adminUrl: e.g. https://your-ghost-site.com
 *  - adminApiKey: key in the form "{id}:{secret}"
 *  - title, html, canonical
 *  - status: 'draft' | 'published'
 */
export async function publishToGhost({ adminUrl, adminApiKey, title, html, canonical, status='draft' }){
  if (!adminUrl || !adminApiKey) throw new Error('Ghost adminUrl and adminApiKey are required');
  const [id, secret] = adminApiKey.split(':');
  if (!id || !secret) throw new Error('Invalid Ghost Admin API key format. Expected {id}:{secret}');
  const token = signGhostJwt(id, secret, adminUrl);

  const endpoint = adminUrl.replace(/\/$/, '') + '/ghost/api/admin/posts/?source=html';
  const body = {
    posts: [{
      title,
      html,
      status,
      canonical_url: canonical
    }]
  };
  const res = await fetch(endpoint, {
    method:'POST',
    headers:{
      'Authorization': `Ghost ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Ghost publish failed: ${res.status} ${txt}`);
  return JSON.parse(txt);
}

function signGhostJwt(id, secret, adminUrl){
  const header = { alg: 'HS256', typ: 'JWT', kid: id };
  const now = Math.floor(Date.now()/1000);
  const payload = {
    iat: now,
    exp: now + 5 * 60,
    aud: adminUrl.replace(/\/$/, '') + '/ghost/api/admin/'
  };
  function b64(obj){
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
  }
  const unsigned = b64(header) + '.' + b64(payload);
  const key = Buffer.from(secret, 'hex');
  const sig = crypto.createHmac('sha256', key).update(unsigned).digest('base64url');
  return unsigned + '.' + sig;
}
