import { JSDOM } from 'jsdom';
export function sanitize(text=''){ return text.replace(/[\u0000-\u001F\u007F]/g, '').trim(); }
export function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
export function stripBoilerplate(text=''){
  const swaps = [
    [/capture timeless (family )?memories/gi, 'create heirloom portraits'],
    [/in today\'s digital age/gi, ''],
    [/safe and comfortable environment/gi, 'RN-verified newborn safety workflow and a temperature-controlled studio'],
    [/tailored to your needs/gi, 'planned around your outfits, wall sizes, and session goals'],
    [/unforgettable moments/gi, 'photographs you\'ll print and keep'],
    [/book your session today/gi, 'check availability']
  ]; return swaps.reduce((t,[re,rep])=>t.replace(re,rep), text);
}
export function ensureSingleOutbound(md, siteDomain){
  let kept = null;
  return md.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (m,a,url)=>{
    if (siteDomain && new RegExp(siteDomain.replace(/\./g,'\\.'),'i').test(url)) return m;
    if (!kept) { kept = url; return m; }
    return a;
  });
}
export function ensureInternal(md, internalList=[], siteDomain){
  const hasInternal = /\]\(\/(?:[^\)]+)\)/.test(md) || (siteDomain && new RegExp(`\\]\\((https?:\\/\\/[^)]+${siteDomain.replace(/\\./g,'\\\\.')}[^)]*)\\)`, 'i').test(md));
  if (hasInternal || internalList.length===0) return md;
  const { anchor='Learn more', url='/' } = internalList[0];
  return md.replace(/(^# .+?\n+)(.+?\.)/s, (m,h,p1)=>`${h}${p1} [${anchor}](${url}).`);
}
export function buildHead({ title, description, canonical, ogImage }){
  return `
<title>${title}</title>
<link rel="canonical" href="${canonical}">
<meta name="description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}
`.trim();
}
export function injectJsonLd(html, schema){
  const json = JSON.stringify(schema);
  return html.replace('</head>', `<script type="application/ld+json">${json}</script>\n</head>`);
}
export function buildArticleSchema({ title, description, canonical, image, brandName }){
  return {
    "@context":"https://schema.org",
    "@type":"Article",
    "headline": title,
    "description": description,
    "mainEntityOfPage": {"@type":"WebPage","@id": canonical},
    ...(image ? {"image": [image]} : {}),
    "author": {"@type":"Organization","name": brandName || "Photography Studio"},
    "publisher": {"@type":"Organization","name": brandName || "Photography Studio"},
    "datePublished": new Date().toISOString()
  };
}
