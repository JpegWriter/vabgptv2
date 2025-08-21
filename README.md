# Vision Auto Blogger — PRO (Generic, with Modular Scrapers)

Production-grade blog generator for photographers worldwide.
Strict brief → writer → critic+repair → link/meta/schema → HTML. Optional WordPress publish.

## Quick start
```bash
cp .env.example .env
npm install
npm start
# http://localhost:8080
```


## Optional Scrapers
You can enable modular scrapers that feed into the context summariser.

### SERP (Serper.dev or Tavily)
Add one of these to `.env`:
```
SERPER_API_KEY=...   # or
TAVILY_API_KEY=...
```

In the request body:
```json
"research": { "enableSERP": true, "query": "family photographer vienna" }
```

### Social Hints
Pass public profile URLs (works best with services like Apify-proxied endpoints):
```json
"social": { "enable": true, "urls": ["https://instagram.com/yourstudio"] }
```

### Reviews
Either include reviews inline or point to a local JSON file path:
```json
"reviews": { "enable": true, "list": [{"rating":5,"text":"Amazing newborn photos!"}] }
```

Everything merges through `mergeResearch()` → used by the writer and critic.


### Vision (Image Analysis)
Provide image URLs (or data URLs) to enrich context with style/lighting/props/mood tags:

Request body:
```json
"images": [
  "https://yourcdn.com/portfolio/family-park-01.jpg",
  "https://yourcdn.com/portfolio/newborn-wrap-02.jpg"
]
```
The system will add `visualNotes` and `visualTags` to context for the writer/critic.
Requires only your OpenAI key (no extra API).


## CI/CD

### GitHub Actions (included)
- Workflow: `.github/workflows/ci.yml`
- Runs on pushes/PRs to `main`/`master`
- Installs deps, **starts the server**, and smoke-tests `/api/health`

No OpenAI calls are made during CI.

### Deploy on Render (click-to-deploy)
- Repo contains `render.yaml`
- In Render dashboard → **New +** → **Blueprint** → point to your repo
- Add `OPENAI_API_KEY` (and optional `SERPER_API_KEY` / `TAVILY_API_KEY`) as environment variables
- Render builds with `npm install` and starts with `node src/server.js`

### Deploy on Railway
- Repo contains `Procfile` (`web: node src/server.js`)
- In Railway → **New Project** → **Deploy from GitHub** → select your repo
- Add environment variables in project settings


### Docker (GHCR)
A GitHub Actions workflow (`.github/workflows/docker-publish.yml`) is included.

- Triggers on tag pushes like `v1.0.0`
- Builds the included `Dockerfile`
- Pushes to GitHub Container Registry (GHCR) under your repo namespace

#### How to use
1. Tag and push a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```
2. GitHub Actions will build and push to:
```
ghcr.io/OWNER/REPO:1.0.0
```
3. Run locally:
```bash
docker run -p 8080:8080 -e OPENAI_API_KEY=sk-... ghcr.io/OWNER/REPO:1.0.0
```


## Extra Publishers

### WordPress (included)
`POST /api/publish/wordpress` with `{ siteUrl, username, appPassword, title, html, canonical }`

### Ghost Admin API (included)
`POST /api/publish/ghost`
```json
{
  "adminUrl": "https://your-ghost-site.com",
  "adminApiKey": "YOUR_ADMIN_ID:YOUR_ADMIN_SECRET",
  "title": "Post title",
  "html": "<h1>...</h1>",
  "canonical": "https://example.com/blog/slug",
  "status": "draft" // or "published"
}
```

### Contentful (CMA) (included)
`POST /api/publish/contentful`
```json
{
  "spaceId": "xxx",
  "environmentId": "master",
  "managementToken": "CFPAT-...",
  "contentTypeId": "blogPost",
  "title": "Post title",
  "slug": "post-slug",
  "body": "<h1>...</h1>",
  "publish": true,
  "locale": "en-US"
}
```

## GHCR Docker image (tag to publish)
- Push a tag like `v1.0.0` to trigger **Build & Push Docker (GHCR)**
- Image will be published to `ghcr.io/<owner>/<repo>:v1.0.0`


## Advanced Additions

### Site Crawler
Body:
```json
"crawl": { "enable": true, "maxPages": 6, "allowPaths": ["/services","/about"] }
```
Finds internal link candidates and pulls text from multiple pages; merges via `mergeCrawl()`.

### Keyword Clustering
Body:
```json
"seo": { "cluster": { "enable": true } }
```
Uses OpenAI to group related terms and propose H2 + FAQ seeds; merged via `mergeClusters()`.

### Content Gap Suggestions
The repair loop calls `suggestMissingTopics()` to nudge missing H2s/topics based on clusters and top SERP snippets.


### Reliability Enhancements

- **Backoff utility (`utils-backoff.js`)**: All scrapers now retry failed fetches with exponential backoff (500ms, 1s, 2s…)
- **STRICT_AEO mode**: Set `STRICT_AEO=true` in `.env` to *hard-fail* if the final draft is missing any AEO block (FAQ, Checklist, Comparison).


## Reliability & Strictness Config
- `HARD_FAIL_AEO` (default `false`): if `true`, the API will **error out** when core Answer Engine blocks are missing (Answer Box, FAQs, Checklist, Comparison). This prevents auto-repair and forces upstream prompt/inputs to be corrected.
- `RATE_LIMIT_DELAY_MS` (default `200`): minimum delay between external HTTP calls (SERP, crawler, social). Also uses exponential backoff on 429/5xx.

The scrapers and crawler use `backoffFetch()` with retries + jitter. This reduces timeouts and flakiness with public endpoints.


## New: Two-pass Writer, Metrics, Link Graph, Schema Variants
- **Two-pass writer**: outline (gpt-4o-mini) → draft (gpt-4o) for coherence and coverage.
- **/api/metrics**: returns uptime, counts, avg stage durations, token counters.
- **Internal link graph**: builds from crawl; used to pick the best internal link by topical similarity.
- **Schema variants**: foundation in `src/schema/` for LocalBusiness and BreadcrumbList (auto-added when data present).

Caching:
- Crawl results cached 6h.
- Keyword clusters cached 24h.
