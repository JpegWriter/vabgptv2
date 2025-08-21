import fetch from 'node-fetch';

/**
 * Publish to Contentful (CMA).
 * Requirements:
 *  - spaceId, environmentId (default 'master'), managementToken
 *  - contentTypeId (e.g., 'blogPost')
 *  - fields: { title, slug, body } (markdown/html -> stored as long text)
 *  - locale (default 'en-US')
 *
 * Note: This creates an entry in draft and upserts fields. Publishing is optional.
 */
export async function publishToContentful({ spaceId, environmentId='master', managementToken, contentTypeId='blogPost', title, slug, body, publish=false, locale='en-US' }){
  if (!spaceId || !managementToken) throw new Error('Contentful spaceId and managementToken are required');
  const base = `https://api.contentful.com/spaces/${spaceId}/environments/${environmentId}`;
  const createRes = await fetch(`${base}/entries`, {
    method:'POST',
    headers:{
      'Authorization': `Bearer ${managementToken}`,
      'X-Contentful-Content-Type': contentTypeId,
      'Content-Type': 'application/vnd.contentful.management.v1+json'
    },
    body: JSON.stringify({
      fields: {
        title: { [locale]: title },
        slug:  { [locale]: slug.replace(/^\/+/, '') },
        body:  { [locale]: body }
      }
    })
  });
  const entry = await createRes.json();
  if (!createRes.ok) throw new Error(`Contentful create failed: ${createRes.status} ${JSON.stringify(entry)}`);

  if (publish){
    const entryId = entry.sys.id;
    const version = entry.sys.version;
    const pubRes = await fetch(`${base}/entries/${entryId}/published`, {
      method:'PUT',
      headers:{
        'Authorization': `Bearer ${managementToken}`,
        'X-Contentful-Version': version
      }
    });
    const pub = await pubRes.json();
    if (!pubRes.ok) throw new Error(`Contentful publish failed: ${pubRes.status} ${JSON.stringify(pub)}`);
    return { entry, published: pub };
  }
  return { entry };
}
