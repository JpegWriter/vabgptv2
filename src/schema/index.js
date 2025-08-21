export function localBusinessSchema({ brandName, url, phone, address, geo }){
  if (!brandName || !url) return null;
  const out = {
    "@context":"https://schema.org",
    "@type":"LocalBusiness",
    "name": brandName,
    "url": url
  };
  if (phone) out.telephone = phone;
  if (address){
    out.address = { "@type":"PostalAddress", ...address };
  }
  if (geo){
    out.geo = { "@type":"GeoCoordinates", ...geo };
  }
  return out;
}
export function breadcrumbSchema({ base, slug }){
  if (!base || !slug) return null;
  const parts = slug.replace(/^\/+/, '').split('/').filter(Boolean);
  const itemListElement = parts.map((p,i)=> ({
    "@type":"ListItem",
    "position": i+1,
    "name": p.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),
    "item": base + '/' + parts.slice(0,i+1).join('/')
  }));
  return { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement };
}
