import { ensureInternal, ensureSingleOutbound, buildHead, injectJsonLd, buildArticleSchema, stripBoilerplate } from './utils.js';
import { pickBestInternalLink } from './internal-link-graph.js';
import { localBusinessSchema, breadcrumbSchema } from './schema/index.js';
import { marked } from 'marked';
export function enforceLinks(md, internals, siteDomain){
  let out = ensureSingleOutbound(md, siteDomain);
  out = ensureInternal(out, internals, siteDomain);
  return out;
}
export function finalizeHtml({ markdown, title, description, canonical, ogImage, brandName }){
  const body = marked.parse(markdown);
  const head = buildHead({ title, description, canonical, ogImage });
  const schema = buildArticleSchema({ title, description, canonical, image: ogImage, brandName });
  let html = `<!doctype html>
<html lang="en">
<head>
${head}
</head>
<body>
<main><article>
${body}
</article></main>
</body>
</html>`;
  html = injectJsonLd(html, schema);
  return html;
}
export function cleanLanguage(md){ return stripBoilerplate(md); }
