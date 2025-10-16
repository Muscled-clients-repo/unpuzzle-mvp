# AI-Powered Blog System Architecture & Implementation Plan

**Date:** 2025-10-16
**Time:** 06:17 AM EST
**Decision:** Build in-house blog CMS instead of using Strapi

## Executive Summary

Building an AI-powered blog management system with admin roles that can generate, approve, and publish SEO-optimized content with minimal manual effort. Focus on ranking high in search engines and AI LLMs (ChatGPT, Claude, Perplexity).

## Why In-House Over Strapi?

### Advantages
1. **Deep AI Integration** - Full control over AI generation and approval workflows
2. **Existing Infrastructure** - Leverage current Supabase + Next.js setup
3. **Zero Additional Services** - No extra hosting/maintenance costs
4. **Tight Platform Integration** - Share auth, UI components, and analytics
5. **Performance** - No external API calls, faster response times
6. **Flexibility** - Custom workflows tailored to our exact needs

### Strapi Drawbacks
- Another service to host and maintain
- Limited customization for AI workflows
- External API latency
- Additional complexity and cost
- Fighting against CMS architecture for custom features

## Database Schema

### Core Tables

```sql
-- Blog Posts
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown/Rich text

  -- SEO Fields
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  canonical_url TEXT,
  og_image_url TEXT,

  -- Author & Category
  author_id UUID REFERENCES users(id),
  category_id UUID REFERENCES blog_categories(id),
  tags TEXT[],

  -- Status & Workflow
  status TEXT CHECK (status IN ('draft', 'pending_review', 'scheduled', 'published', 'archived')),
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT, -- Store the generation prompt
  ai_model TEXT, -- Which AI model generated it

  -- Media
  featured_image_url TEXT,
  featured_image_alt TEXT,

  -- Metadata
  reading_time INTEGER, -- Auto-calculated
  featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  seo_score INTEGER, -- Auto-calculated SEO score

  -- Publishing
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  CREATE INDEX idx_blog_posts_status ON blog_posts(status);
  CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
  CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
  CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
);

-- Blog Categories
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  meta_description TEXT,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Analytics (for tracking performance)
CREATE TABLE blog_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  avg_time_on_page INTEGER, -- seconds
  bounce_rate DECIMAL(5,2),
  referrer_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id, date, referrer_source)
);

-- User Role Extension
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT
  CHECK (role IN ('student', 'instructor', 'admin'))
  DEFAULT 'student';
```

### RLS Policies

```sql
-- Blog posts - Public read for published posts
CREATE POLICY "Published posts are viewable by everyone"
  ON blog_posts FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

-- Blog posts - Admins can do everything
CREATE POLICY "Admins can manage all blog posts"
  ON blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Blog analytics - Admins only
CREATE POLICY "Admins can view analytics"
  ON blog_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

## AI Features & Capabilities

### 1. AI Blog Generation Service

**Location:** `/src/lib/services/blog-ai-service.ts`

```typescript
interface BlogGenerationInput {
  topic: string
  keywords: string[]
  targetLength: 'short' | 'medium' | 'long' // 500/1000/2000 words
  tone: 'professional' | 'casual' | 'educational'
  targetAudience: string
  includeInternalLinks?: boolean
  category?: string
}

interface BlogGenerationOutput {
  title: string
  slug: string
  excerpt: string
  content: string // Markdown
  metaDescription: string
  keywords: string[]
  suggestedTags: string[]
  readingTime: number
  seoScore: number
  internalLinks: Array<{text: string, url: string}>
}
```

**AI Provider:** Claude Sonnet 3.5 or GPT-4o (configurable)

**Features:**
- Generate full blog post from topic + keywords
- Auto-optimize for SEO (keyword density, headers, meta tags)
- Suggest internal links to existing courses/posts
- Calculate reading time
- Generate engaging titles and excerpts
- Create meta descriptions under 160 chars
- Structure content with proper H2/H3 hierarchy

### 2. Bulk AI Generation

**Workflow:**
1. Admin uploads CSV/list of topics
2. AI generates drafts for all topics
3. All saved as 'draft' status
4. Admin reviews in batch mode
5. Mass approve or individual edits
6. Schedule publishing queue

### 3. SEO Auto-Optimization

**Features:**
- **Keyword Analysis:** Check density, placement in title/headers
- **Readability Score:** Flesch reading ease
- **Meta Tags Validation:** Title length, description length
- **Internal Linking:** Suggest relevant course/post links
- **Image Alt Tags:** Auto-generate from context
- **Schema Markup:** Auto-generate Article structured data
- **URL Structure:** SEO-friendly slugs

**SEO Score Calculation (0-100):**
- Title optimized (15 points)
- Meta description present & optimized (15 points)
- Keywords in first paragraph (10 points)
- Proper heading hierarchy (10 points)
- Internal links present (10 points)
- Image alt tags (10 points)
- Reading time appropriate (10 points)
- Content length adequate (10 points)
- Schema markup present (10 points)

### 4. AI Content Improvement

**Features:**
- Suggest better headlines
- Improve readability
- Add missing keywords naturally
- Restructure for better flow
- Generate FAQ sections
- Create social media snippets

## Admin Workflow System

### Dashboard Layout

```
/admin/blog
  ├── Overview (stats, recent posts)
  ├── All Posts (table with filters)
  ├── Drafts (pending review)
  ├── Scheduled (calendar view)
  ├── Published (analytics)
  ├── Categories & Tags
  └── AI Generator
```

### Post Statuses & Flow

```
Draft → Pending Review → Scheduled → Published
   ↓         ↓              ↓           ↓
Archived ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

**Status Definitions:**
- **Draft:** Work in progress, not visible to anyone except creator
- **Pending Review:** Waiting for admin approval
- **Scheduled:** Approved, will auto-publish at scheduled time
- **Published:** Live on site
- **Archived:** Removed from public view but kept in DB

### Approval Workflows

**Option 1: Manual Approval**
1. Admin reviews each draft
2. Can edit before approving
3. Approves or sends back to draft
4. Sets publish date/time

**Option 2: Auto-Approval**
1. Set SEO score threshold (e.g., 80+)
2. Posts above threshold auto-schedule
3. Posts below threshold go to pending review
4. Admin can always override

**Option 3: Bulk Approval**
1. Admin sees list of pending posts
2. Preview each quickly
3. Checkbox to select multiple
4. Bulk action: Approve all, Schedule all, Delete all

## SEO & AI Discoverability Features

### 1. Structured Data (Schema.org)

Auto-generate JSON-LD for each post:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Post Title",
  "description": "Post excerpt",
  "image": "featured-image-url",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Unpuzzle",
    "logo": {
      "@type": "ImageObject",
      "url": "https://unpuzzle.com/logo.png"
    }
  },
  "datePublished": "2025-10-16",
  "dateModified": "2025-10-16"
}
```

### 2. OpenGraph & Twitter Cards

Auto-generate meta tags:
```html
<meta property="og:title" content="..." />
<meta property="og:description" content="..." />
<meta property="og:image" content="..." />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
```

### 3. Sitemap Generation

**Auto-update on publish:**
- `/sitemap.xml` - Main sitemap index
- `/blog-sitemap.xml` - Blog posts only
- Include lastmod, priority, changefreq
- Submit to search engines via API

### 4. RSS Feed

**Location:** `/blog/rss.xml`

Benefits:
- AI crawlers often check RSS feeds
- Easy content distribution
- Reader subscriptions

### 5. Internal Linking Strategy

**AI-Powered Suggestions:**
- Analyze post content
- Find relevant courses/lessons
- Suggest contextual links
- Auto-insert or show suggestions to admin

**Example:**
Post about "React Hooks" → Auto-suggest links to React courses

### 6. Robots.txt & Meta Robots

```
User-agent: *
Allow: /blog/
Sitemap: https://unpuzzle.com/sitemap.xml
```

### 7. Canonical URLs

Prevent duplicate content issues:
```html
<link rel="canonical" href="https://unpuzzle.com/blog/post-slug" />
```

### 8. Performance Optimization

- **Image Optimization:** Next.js Image component, WebP format
- **Code Splitting:** Dynamic imports for blog components
- **Static Generation:** Pre-render blog posts at build time
- **CDN Caching:** Cache blog pages aggressively

## Implementation Phases

### Phase 1: Database & Core CRUD
- Create Supabase migrations
- Add admin role to users
- Build basic blog CRUD actions
- Create admin UI for manual post creation

**Deliverables:**
- Migration files
- Server actions for CRUD
- Basic admin UI (create, edit, delete, list)

### Phase 2: AI Generation Service
- Integrate Claude/OpenAI API
- Build blog generation service
- Create AI generator UI in admin
- Implement draft creation from AI

**Deliverables:**
- AI service with prompt engineering
- Generator form in admin panel
- Draft preview before saving

### Phase 3: Workflows & Approval
- Implement status system
- Build approval UI
- Add bulk operations
- Create scheduling system (cron job)

**Deliverables:**
- Status workflow logic
- Approval interface
- Bulk action buttons
- Auto-publish scheduled posts

### Phase 4: SEO Optimization
- Add SEO score calculator
- Generate structured data
- Create sitemap generator
- Build internal linking AI
- Add meta tag optimization

**Deliverables:**
- SEO score on each post
- Auto-generated schema markup
- Dynamic sitemap
- Internal link suggestions

### Phase 5: Migration & Polish
- Migrate existing 6 static posts to DB
- Update frontend to use DB
- Add analytics tracking
- Performance optimization

**Deliverables:**
- Existing posts in database
- Frontend fetching from DB
- View tracking working
- Fast page loads

## Tech Stack

**Backend:**
- Supabase (PostgreSQL)
- Server Actions (Next.js)
- Anthropic Claude API (or OpenAI)

**Frontend:**
- Next.js 14 App Router
- React Server Components
- Tailwind CSS
- Shadcn UI (reuse existing components)

**AI/ML:**
- Claude Sonnet 3.5 for generation
- Custom prompt engineering
- SEO scoring algorithms

**SEO:**
- next-sitemap for sitemap generation
- React Helmet for meta tags
- Schema markup generation
- Internal linking algorithms

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── blog/
│   │       ├── page.tsx (Overview)
│   │       ├── posts/
│   │       │   ├── page.tsx (List all)
│   │       │   ├── new/page.tsx (Create)
│   │       │   └── [id]/
│   │       │       ├── page.tsx (Edit)
│   │       │       └── preview/page.tsx
│   │       ├── drafts/page.tsx
│   │       ├── scheduled/page.tsx
│   │       ├── categories/page.tsx
│   │       └── ai-generator/page.tsx
│   └── blog/
│       ├── page.tsx (Updated to use DB)
│       └── [slug]/page.tsx (Updated to use DB)
├── lib/
│   ├── actions/
│   │   └── blog-actions.ts (CRUD operations)
│   ├── services/
│   │   ├── blog-ai-service.ts (AI generation)
│   │   ├── seo-service.ts (SEO optimization)
│   │   └── blog-scheduler.ts (Auto-publish)
│   └── utils/
│       ├── seo-calculator.ts
│       └── slug-generator.ts
├── components/
│   └── admin/
│       └── blog/
│           ├── BlogPostEditor.tsx
│           ├── BlogPostList.tsx
│           ├── AIGeneratorForm.tsx
│           ├── SEOScoreCard.tsx
│           └── BulkActionsToolbar.tsx
└── types/
    └── blog.ts (Updated types)
```

## Security Considerations

1. **Admin-Only Access:** RLS policies enforce admin role
2. **Input Sanitization:** Validate all user inputs
3. **XSS Prevention:** Sanitize markdown content
4. **Rate Limiting:** Limit AI generation requests
5. **API Key Security:** Use environment variables
6. **Content Moderation:** Review AI-generated content

## Cost Estimation

**AI Generation Costs:**
- Claude Sonnet 3.5: ~$3 per 1M tokens
- Average blog post: ~2000 tokens output
- Cost per post: ~$0.006
- 100 posts: ~$0.60

**Infrastructure:**
- Supabase: Free tier sufficient initially
- Vercel: Free tier for hosting
- Total additional cost: Minimal (~$10/month for higher volumes)

## Success Metrics

**SEO Performance:**
- Average SEO score > 80
- Top 10 rankings for target keywords
- Organic traffic growth month-over-month

**Content Efficiency:**
- Time to publish: < 5 minutes (vs hours manually)
- AI-generated posts quality rating by admins
- Published posts per week increase

**Discoverability:**
- Indexed pages in Google Search Console
- Crawl frequency
- AI LLM citation rate (track mentions in ChatGPT, Claude, Perplexity)

## Next Steps

1. **Review & Approve Plan:** Get stakeholder approval
2. **Set Up API Keys:** Claude/OpenAI API access
3. **Start Phase 1:** Create database migrations
4. **Build Iteratively:** Ship each phase and gather feedback
5. **Monitor & Optimize:** Track SEO performance and improve

## Questions to Address

- [ ] Which AI model to use primarily? (Claude vs GPT-4)
- [ ] Auto-approval threshold? (SEO score > X)
- [ ] Publishing frequency target? (X posts per week)
- [ ] Categories to focus on initially?
- [ ] Internal linking priority? (Courses vs other posts)

---

**Status:** Plan Approved, Ready for Implementation
**Next Action:** Create database migration for blog tables
