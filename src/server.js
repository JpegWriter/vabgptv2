import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { buildContextPackets, mergeResearch, mergeVision, mergeCrawl, mergeClusters } from './context-summariser.js';
import { assertBrief } from './briefGuard.js';
import { generateDraft } from './writer.js';
import { generateOutline, generateDraftFromOutline } from './writer-outline.js';
import { criticCheck } from './critic.js';
import { repairDraft } from './repair.js';
import { enforceLinks, finalizeHtml, cleanLanguage } from './linkMetaSchema.js';
import { buildLinkGraph, pickBestInternalLink } from './internal-link-graph.js';
import { clusterKeywords } from './seo/cluster.js';
import { suggestMissingTopics } from './seo/gap.js';
import { runScrapers, analyzeImages, crawlSite } from './scrapers/index.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

const PORT = process.env.PORT || 8080;
const CANONICAL_BASE = process.env.CANONICAL_BASE || 'https://example.com';
const MODEL = process.env.MODEL || 'gpt-4o';
const HARD_FAIL_AEO = String(process.env.HARD_FAIL_AEO||'false').toLowerCase() === 'true';

app.get('/api/health', (req,res)=> res.json({ ok:true, time:new Date().toISOString() }));
app.get('/api/metrics', (req,res)=> res.json(snapshot()));

app.post('/api/generate', async (req,res) => {
  function markTrace(ctx, step, ok, extra=''){ try{ if(!ctx.trace) ctx.trace=[]; ctx.trace.push({ step, status: ok ? '✅' : '⚠️', note: extra }); }catch(e){} }
  try{
    const { brand, primary_keyphrase, region, services, internal_links, aeo, url, proofs, site } = req.body || {};
    let context = await buildContextPackets({ url, brand, services, region, proofs, internalLinks: internal_links });

    // Optional research scrapers
    if (req.body?.research || req.body?.social || req.body?.reviews){
      const scraped = await runScrapers({ research: req.body.research, region, social: req.body.social, reviews: req.body.reviews });
      context = mergeResearch(context, scraped);
    markTrace(context, 'Research', true, `${(scraped?.serp?.paa?.length||0)} PAA / ${(scraped?.serp?.related?.length||0)} related / ${(scraped?.social?.items?.length||0)} social / ${(scraped?.reviews?.topTerms?.length||0)} review terms`);
    }

    // Optional vision image analysis
    if (Array.isArray(req.body?.images) && req.body.images.length){
      const vision = await analyzeImages({ apiKey: process.env.OPENAI_API_KEY, images: req.body.images });
      context = mergeVision(context, vision);
      markTrace(context, 'Vision', true, `${vision?.items?.length||0} notes, ${vision?.tags?.length||0} tags`);
    }
    const brief = assertBrief({
      brand,
      primary_keyphrase,
      region: { city: region?.city, locale: region?.locale || 'en-US' },
      services: (context.services || []),
      internal_links,
      aeo: aeo || { faqs: 4, comparison: true, checklist: true }
    });
    context = context || {}; markTrace(context, 'Brief', true, 'validated');
    const base = (site?.baseUrl || CANONICAL_BASE).replace(/\/$/, '');
    const siteDomain = (new URL(base)).host || 'example.com';
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
    const tOutline = timer('writer_outline');
    const outline = await generateOutline({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini', brief, context });
    tOutline();
    markTrace(context, 'Outline', true, `${(outline?.h2?.length||outline?.H2?.length||0)} sections`);
    const tDraft = timer('writer_draft');
    let draft = await generateDraftFromOutline({ apiKey: process.env.OPENAI_API_KEY, model: MODEL, brief, context, outline });
    tDraft();
    markTrace(context, 'Draft', true, `${(draft?.length||0)} chars`);
    const STRICT_AEO = process.env.STRICT_AEO === 'true';
let lastIssues = [];
    for (let i=0;i<2;i++){
      let issues = criticCheck(draft, brief, context);
      lastIssues = issues.slice();
      const aeoCritical = issues.filter(m =>
        /Missing Answer Box|Missing FAQs|Missing comparison table|Missing checklist/i.test(m)
      );
      const gapIssues = suggestMissingTopics({ draftMd: draft, h2Seeds: context.h2Seeds || [], competitorSnippets: context.topSnippets || [] });
      issues.push(...gapIssues);

      if (HARD_FAIL_AEO && aeoCritical.length){
        throw new Error("HARD_FAIL_AEO: " + aeoCritical.join(' | '));
      }
      if (!issues.length) break;
      draft = await repairDraft({ apiKey: process.env.OPENAI_API_KEY, model: MODEL, draft, issues, brief, context });
    }
    markTrace(context, 'Quality Check', true, `${lastIssues.length} issues`);
    draft = enforceLinks(draft, context.internalLinks, siteDomain);
    markTrace(context, 'Links', true, 'internal+outbound enforced');
    draft = cleanLanguage(draft);
    markTrace(context, 'Language', true, 'boilerplate cleaned');
    const title = /SEO Title:\s*(.+)/i.exec(draft)?.[1]?.trim() || brief.primary_keyphrase;
    const description = /Meta:\s*(.+)/i.exec(draft)?.[1]?.trim() || `Learn about ${brief.primary_keyphrase} in ${brief.region.city}.`;
    const slug = /Slug:\s*(.+)/i.exec(draft)?.[1]?.trim() || '/blog/' + brief.primary_keyphrase.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const canonical = base + slug;
    const html = finalizeHtml({ markdown: draft, title, description, canonical, ogImage: null, brandName: brand });
    res.json({ ok:true, markdown: draft, html, meta:{ title, description }, canonical, siteDomain, contextTrace: context.trace || [] });
  }catch(e){
    res.status(400).json({ ok:false, error: e.message });
  }
});

import { publishToWordPress } from './publisher-wordpress.js';
import { publishToGhost } from './publisher-ghost.js';
import { publishToContentful } from './publisher-contentful.js';
app.post('/api/publish/wordpress', async (req,res) => {
  try{
    const { siteUrl, username, appPassword, title, html, canonical } = req.body || {};
    const result = await publishToWordPress({ siteUrl, username, appPassword, title, html, canonical });
    res.json({ ok:true, post: result });
  }catch(e){
    res.status(400).json({ ok:false, error: e.message });
  }
});

app.listen(PORT, () => console.log('Vision Auto Blogger PRO on http://localhost:'+PORT));


app.post('/api/publish/ghost', async (req,res) => {
  try{
    const { adminUrl, adminApiKey, title, html, canonical, status } = req.body || {};
    const result = await publishToGhost({ adminUrl, adminApiKey, title, html, canonical, status });
    res.json({ ok:true, post: result });
  }catch(e){
    res.status(400).json({ ok:false, error: e.message });
  }
});

app.post('/api/publish/contentful', async (req,res) => {
  try{
    const { spaceId, environmentId, managementToken, contentTypeId, title, slug, body, publish, locale } = req.body || {};
    const result = await publishToContentful({ spaceId, environmentId, managementToken, contentTypeId, title, slug, body, publish, locale });
    res.json({ ok:true, entry: result });
  }catch(e){
    res.status(400).json({ ok:false, error: e.message });
  }
});
