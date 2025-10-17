# Blog SEO Optimization Plan

**Date**: October 16, 2025
**Current Status**: Basic blog system with mock data
**Goal**: Achieve top rankings on Google, ChatGPT, Claude, and Perplexity

---

## Executive Summary

The current blog system has a solid foundation with basic SEO elements, but is missing critical components for high rankings and AI discovery. This document outlines what exists, what's missing, and a phased implementation plan.

**Impact Estimate**:
- Phase 1 implementation: **+60% SEO score**
- Full implementation: **Top 10 rankings potential**

---

## ✅ Current Blog System (What We Have)

### Existing Pages
- `/blog` - Main listing page with categories & search
- `/blog/[slug]` - Individual post pages with full content

### SEO Elements Present
| Element | Status | Quality |
|---------|--------|---------|
| OpenGraph metadata | ✅ | Good |
| Twitter cards | ✅ | Good |
| Breadcrumb navigation | ✅ | Good |
| Author attribution | ✅ | Basic |
| Tags system | ✅ | Basic |
| Related posts | ✅ | Good |
| Social sharing buttons | ✅ | Good |
| Reading time | ✅ | Good |
| Publish dates | ✅ | Good |
| Category filtering | ✅ | Good |
| Newsletter signup | ✅ | Good |
| Meta descriptions | ✅ | Basic |

**Overall Score**: 6/10 (Functional but not optimized)

---

## ❌ What's Missing for High SEO Rankings

### 🚨 CRITICAL Missing Elements (Phase 1)

#### 1. JSON-LD Structured Data ⭐⭐⭐⭐⭐
**Impact**: HIGHEST
**Why Critical**: Google, Bing, and AI systems (ChatGPT, Perplexity, Claude) use structured data to understand content

**Required Schemas**:
```json
{
  "@type": "Article",
  "headline": "...",
  "author": {
    "@type": "Person",
    "name": "..."
  },
  "datePublished": "...",
  "dateModified": "...",
  "image": "...",
  "publisher": {
    "@type": "Organization",
    "name": "Unpuzzle",
    "logo": "..."
  }
}
```

**Additional Schemas Needed**:
- BreadcrumbList (navigation)
- Person (author profiles)
- Organization (Unpuzzle identity)
- FAQPage (for Q&A posts)
- HowTo (for tutorial posts)

**Files to Modify**:
- `src/app/blog/[slug]/page.tsx` - Add JSON-LD script tag
- `src/lib/seo/structured-data.ts` - Create utility functions

---

#### 2. XML Sitemap ⭐⭐⭐⭐⭐
**Impact**: HIGHEST
**Why Critical**: Tells search engines what pages exist and when they were updated

**Implementation**:
```typescript
// src/app/sitemap.ts
export default function sitemap() {
  return [
    { url: 'https://unpuzzle.com/blog', changefreq: 'daily', priority: 1.0 },
    ...blogPosts.map(post => ({
      url: `https://unpuzzle.com/blog/${post.slug}`,
      lastModified: post.updatedAt || post.publishedAt,
      changefreq: 'weekly',
      priority: 0.8
    }))
  ]
}
```

**Endpoints**:
- `/sitemap.xml` - Main sitemap
- `/blog-sitemap.xml` - Blog-specific (optional)

---

#### 3. RSS Feed ⭐⭐⭐⭐⭐
**Impact**: HIGH for AI Discovery
**Why Critical**: Perplexity, ChatGPT, and other AI systems heavily use RSS for content discovery

**Implementation**:
- `/blog/rss.xml` - Standard RSS 2.0 feed
- `/blog/atom.xml` - Atom feed (optional)

**RSS Format**:
```xml
<rss version="2.0">
  <channel>
    <title>Unpuzzle Blog</title>
    <link>https://unpuzzle.com/blog</link>
    <description>Insights on Learning, AI, and Education</description>
    <item>
      <title>How AI is Revolutionizing...</title>
      <link>https://unpuzzle.com/blog/ai-powered-learning</link>
      <description>...</description>
      <pubDate>Thu, 08 Jan 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

---

#### 4. Robots.txt ⭐⭐⭐⭐
**Impact**: HIGH
**Why Critical**: Controls crawler access and points to sitemap

**Implementation**:
```txt
# /public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

# Sitemaps
Sitemap: https://unpuzzle.com/sitemap.xml
Sitemap: https://unpuzzle.com/blog-sitemap.xml
```

---

#### 5. Canonical URLs ⭐⭐⭐⭐
**Impact**: HIGH
**Why Critical**: Prevents duplicate content penalties

**Implementation**:
```typescript
// In metadata
export async function generateMetadata({ params }) {
  return {
    // ... other metadata
    alternates: {
      canonical: `https://unpuzzle.com/blog/${params.slug}`
    }
  }
}
```

---

### 📄 Missing Components & Pages (Phase 2)

#### 1. Enhanced Author Bio Component ⭐⭐⭐⭐
**Location**: Bottom of each blog post
**Impact**: HIGH (E-E-A-T signal)

**Why Important**:
- Demonstrates author expertise directly on content
- Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trust)
- Better than separate pages (simpler to maintain)
- Shows credentials where readers are already engaged

**Required Content**:
- Full bio (150-200 words)
- Profile photo (150x150px minimum)
- Job title and credentials
- Social media links (LinkedIn, Twitter, etc.)
- Years of experience
- Notable achievements/publications

**Component Structure**:
```typescript
<AuthorBioCard
  name="Dr. Sarah Chen"
  role="Head of AI Research"
  bio="Dr. Sarah Chen is the Head of AI Research at Unpuzzle with 15 years
       of experience in educational technology. She holds a PhD in Machine
       Learning from MIT and has published 20+ papers on AI in education."
  photo="/authors/sarah-chen.jpg"
  social={{
    linkedin: "https://linkedin.com/in/sarahchen",
    twitter: "https://twitter.com/sarahchen"
  }}
  credentials={["PhD Machine Learning (MIT)", "15+ years EdTech"]}
/>
```

**Alternative Option**: Simple `/about` or `/team` page listing all authors

---

#### 2. Category Archive Pages ⭐⭐⭐⭐
**Route**: `/blog/category/[slug]`
**Impact**: HIGH

**Why Important**:
- Better than filter-only approach
- Creates more indexable pages
- Improves internal linking structure
- Long-tail keyword opportunities

**Example**:
- `/blog/category/ai-technology`
- `/blog/category/learning-science`
- `/blog/category/student-success`

**Required Elements**:
- Category description (SEO paragraph)
- Post count
- Filtered post list
- Subscribe to category (optional)

---

#### 3. Tag Pages ⭐⭐⭐
**Route**: `/blog/tag/[tag]`
**Impact**: MEDIUM

**Why Important**:
- Long-tail keyword targeting
- Topic clustering
- Internal linking

**Example**:
- `/blog/tag/active-learning`
- `/blog/tag/machine-learning`
- `/blog/tag/study-tips`

---

#### 4. Archive Pages ⭐⭐⭐
**Route**: `/blog/[year]` or `/blog/[year]/[month]`
**Impact**: MEDIUM

**Why Important**:
- Shows publishing consistency
- Historical content organization
- Google values regular publishing

**Example**:
- `/blog/2025` - All 2025 posts
- `/blog/2025/01` - January 2025 posts

---

#### 5. Search Results Page ⭐⭐⭐
**Route**: `/blog/search?q=...`
**Impact**: MEDIUM

**Current**: Client-side filtering only
**Improved**: Dedicated page with URL params

**Why Important**:
- Trackable in analytics
- Better UX for bookmarking
- Can be indexed (with noindex on ?q= pages)

---

#### 6. Blog Home/About Page ⭐⭐⭐
**Route**: `/blog/about`
**Impact**: MEDIUM (E-E-A-T signal)

**Required Content**:
- Mission statement
- Editorial standards
- Writing team intro
- Content quality promise

---

### 🎯 Content Enhancements (Phase 3)

#### 1. Table of Contents ⭐⭐⭐⭐
**Location**: Top of each blog post
**Impact**: HIGH

**Why Important**:
- Better UX for long posts
- Google can extract "jump to" links
- AI systems understand content structure

**Implementation**:
```typescript
// Auto-generate from H2/H3 headings
<TableOfContents sections={extractHeadings(post.content)} />
```

---

#### 2. Featured Images with Alt Text ⭐⭐⭐⭐
**Current**: Placeholder gradients
**Improved**: Real images with descriptive alt text

**Why Important**:
- Image search SEO
- Accessibility
- Social media previews

**Requirements**:
- 1200x630px for social sharing
- WebP format for performance
- Descriptive alt text with keywords

---

#### 3. Internal Link Recommendations ⭐⭐⭐
**Location**: Within post content
**Impact**: MEDIUM-HIGH

**Why Important**:
- Keeps users on site (dwell time)
- Distributes link equity
- Helps Google understand site structure

**Implementation**:
- "You might also like" boxes
- Contextual inline links
- Related reading at paragraph breaks

---

#### 4. Comments Section ⭐⭐⭐
**Options**: Disqus, Giscus (GitHub), custom
**Impact**: MEDIUM

**Why Important**:
- User-generated content
- Engagement signals
- Community building

**Considerations**:
- Spam management
- Moderation needs
- Privacy compliance

---

#### 5. Social Proof ⭐⭐⭐
**Elements**:
- View counts
- Share counts
- Read completion rate
- Time on page

**Why Important**:
- Trust signals
- Popularity indicators for AI
- Encourages sharing

---

#### 6. Content Upgrades ⭐⭐
**Examples**:
- Downloadable PDFs
- Checklists
- Templates
- Email courses

**Why Important**:
- Lead generation
- Increased dwell time
- Demonstrates value

---

### 🤖 AI Discovery Optimizations (Phase 3)

#### 1. HowTo Schema ⭐⭐⭐⭐
**For**: Tutorial-style posts
**Impact**: HIGH for AI systems

```json
{
  "@type": "HowTo",
  "name": "How to Build...",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Step 1",
      "text": "...",
      "image": "..."
    }
  ]
}
```

---

#### 2. FAQ Schema ⭐⭐⭐⭐
**For**: Q&A format posts
**Impact**: HIGH for featured snippets

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is...",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "..."
      }
    }
  ]
}
```

---

#### 3. Video Schema ⭐⭐⭐
**For**: Posts with embedded videos
**Impact**: MEDIUM

---

#### 4. Reading Progress Indicator ⭐⭐⭐
**Visual**: Progress bar at top
**Impact**: MEDIUM (engagement signal)

---

#### 5. Social Proof Display ⭐⭐
**Elements**:
- "X people read this"
- "Shared Y times"
- "Z minutes average read time"

---

### ⚡ Technical SEO Missing

#### 1. Meta Description Optimization ⭐⭐⭐⭐
**Current**: Basic descriptions
**Improved**: 150-160 characters with primary keyword

---

#### 2. Image Optimization ⭐⭐⭐⭐
**Requirements**:
- Actual images (not placeholders)
- Alt text with keywords
- Lazy loading
- WebP format
- Responsive sizes

---

#### 3. Core Web Vitals ⭐⭐⭐⭐
**Metrics to Optimize**:
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

---

#### 4. Last Modified Date Tracking ⭐⭐⭐
**Implementation**:
```typescript
interface BlogPost {
  // ... existing fields
  publishedAt: string
  updatedAt?: string // Add this
}
```

---

#### 5. Reading Time Schema ⭐⭐⭐
```json
{
  "timeRequired": "PT5M" // ISO 8601 duration
}
```

---

## 🎯 Phased Implementation Plan

**Strategy**: Implement Phase 1-3 with **mock data** to discover exact requirements, then design database schema in Phase 4 based on finalized mock data structure.

---

### Phase 1: Critical SEO - HIGHEST PRIORITY

**Data Source**: Mock data from `/src/data/blog-posts.ts`
**Estimated Time**: 8-12 hours
**Impact**: +60% SEO score
**Difficulty**: Medium

**Tasks**:
1. Add JSON-LD structured data to blog posts
   - Article schema
   - BreadcrumbList schema
   - Organization schema
   - Person schema (authors)

2. Generate XML sitemap
   - `/sitemap.xml` endpoint
   - Auto-update on new posts

3. Create RSS feed
   - `/blog/rss.xml` endpoint
   - Include full content

4. Add robots.txt
   - Allow/disallow rules
   - Sitemap reference

5. Add canonical URLs
   - All blog post metadata
   - Blog listing page

**Success Metrics**:
- Google Search Console shows sitemap
- RSS validates at feedvalidator.org
- Rich results test passes for articles

---

### Phase 2: Important Components & Pages

**Data Source**: Extended mock data (add new fields to `/src/data/blog-posts.ts`)
**Estimated Time**: 10-14 hours
**Impact**: +25% SEO score
**Difficulty**: Medium

**Mock Data Extensions Needed**:
- `author.bio` - Full 150-200 word bio
- `author.social` - LinkedIn, Twitter links
- `author.credentials` - Array of achievements
- `updatedAt` - Last modified timestamp
- Real featured image URLs

**Tasks**:
1. Create enhanced author bio component
   - Author bio card at bottom of each post
   - Full credentials and social links
   - Author schema in JSON-LD (already in Phase 1)

2. Create category archive pages
   - `/blog/category/[slug]` route
   - Category descriptions
   - Filtered post lists

3. Add table of contents to posts
   - Auto-generate from headings
   - Jump links

4. Implement last modified tracking
   - Add `updatedAt` field to blog posts
   - Display in UI
   - Include in metadata

5. Improve featured images
   - Real images with alt text
   - Proper social sharing sizes (1200x630px)

**Success Metrics**:
- Author bios visible on all posts with credentials
- Category pages indexed
- Social sharing shows correct images

---

### Phase 3: Enhanced Features

**Data Source**: Extended mock data (add interaction data fields)
**Estimated Time**: 20-30 hours
**Impact**: +15% SEO score
**Difficulty**: Medium-High

**Mock Data Extensions Needed**:
- `comments` - Array of mock comments
- `likes` - Mock like count
- `views` - Mock view count
- `readCompletionRate` - Mock percentage

**Tasks**:
1. Tag pages
2. Archive pages (year/month)
3. Search results page
4. Comments section
5. Reading progress indicator
6. Social proof metrics
7. Content upgrades (PDFs, etc.)
8. HowTo and FAQ schemas
9. Internal link recommendations
10. Core Web Vitals optimization

**Success Metrics**:
- All new pages indexed
- User engagement increases
- Dwell time improves

---

### Phase 4: Content Management System (Database + Tiptap)

**Data Source**: Migrate from mock data to PostgreSQL database
**Estimated Time**: 30-40 hours
**Impact**: Content creation workflow + Real data persistence
**Difficulty**: High

**Why Phase 4 Last?**
- Phase 1-3 discover exact data requirements through implementation
- Database schema designed based on finalized mock data structure
- No refactoring due to missing/unused fields
- Tables perfectly match working UI

**Database Tables Required (4 core + 3 optional)**:

#### Core Tables (Minimum to Launch):

1. **`blog_posts`**
   ```sql
   CREATE TABLE blog_posts (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     title TEXT NOT NULL,
     slug TEXT UNIQUE NOT NULL,
     excerpt TEXT NOT NULL,
     content JSONB NOT NULL,              -- Tiptap JSON format
     content_html TEXT NOT NULL,           -- Rendered HTML
     author_id UUID REFERENCES users(id),
     category_id UUID REFERENCES blog_categories(id),
     featured_image_url TEXT,
     published_at TIMESTAMPTZ,
     updated_at TIMESTAMPTZ DEFAULT now(),
     status TEXT DEFAULT 'draft',          -- draft | published
     reading_time INTEGER,
     featured BOOLEAN DEFAULT false,
     view_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT now()
   );

   CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
   CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
   CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
   CREATE INDEX idx_blog_posts_category_id ON blog_posts(category_id);
   ```

2. **`blog_categories`**
   ```sql
   CREATE TABLE blog_categories (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     slug TEXT UNIQUE NOT NULL,
     description TEXT,
     post_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

3. **`blog_tags`**
   ```sql
   CREATE TABLE blog_tags (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     slug TEXT UNIQUE NOT NULL,
     post_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

4. **`blog_post_tags`** (Junction Table)
   ```sql
   CREATE TABLE blog_post_tags (
     post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
     tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
     PRIMARY KEY (post_id, tag_id)
   );
   ```

#### Optional Tables (Phase 3 Features):

5. **`blog_comments`**
   ```sql
   CREATE TABLE blog_comments (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
     user_id UUID REFERENCES users(id),
     parent_id UUID REFERENCES blog_comments(id),  -- For replies
     content TEXT NOT NULL,
     approved BOOLEAN DEFAULT false,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   ```

6. **`blog_post_views`** (Analytics)
   ```sql
   CREATE TABLE blog_post_views (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
     user_id UUID REFERENCES users(id),  -- Nullable for anonymous
     viewed_at TIMESTAMPTZ DEFAULT now(),
     ip_address TEXT,
     user_agent TEXT
   );
   ```

7. **`blog_post_likes`** (Social Proof)
   ```sql
   CREATE TABLE blog_post_likes (
     post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT now(),
     PRIMARY KEY (post_id, user_id)
   );
   ```

**Reuse Existing Tables**:
- `users` - For author information (instructors write posts)
- `media_files` - For featured images and inline images

**Tiptap Integration Tasks**:

1. **Install Dependencies**
   ```bash
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
   ```

2. **Create Admin Routes**
   - `/instructor/blog` - List all posts (draft + published)
   - `/instructor/blog/new` - Create new post with Tiptap editor
   - `/instructor/blog/[id]/edit` - Edit post with Tiptap editor

3. **Create Tiptap Components**
   - `src/components/blog/tiptap-editor.tsx` - Rich text editor
   - `src/components/blog/tiptap-renderer.tsx` - Render Tiptap JSON to HTML
   - `src/components/blog/tiptap-toolbar.tsx` - Editor toolbar

4. **Database Migrations**
   - Migration: `create_blog_system_tables.sql` - All 7 tables
   - Migration: `backfill_blog_posts_from_mock_data.sql` - Transfer existing 6 posts

5. **Author Bio Enhancement**
   - Add columns to `users` table:
     - `bio TEXT`
     - `linkedin_url TEXT`
     - `twitter_url TEXT`
     - `credentials JSONB`

6. **API Routes**
   - `/api/blog/posts` - CRUD operations
   - `/api/blog/upload-image` - Image uploads for editor
   - `/api/blog/generate-slug` - Auto-generate URL-friendly slugs

**Tiptap Features to Implement**:
- Headings (H2, H3, H4)
- Bold, italic, code
- Bullet lists, numbered lists
- Links (internal + external)
- Images (upload via media_files)
- Code blocks with syntax highlighting
- Blockquotes
- Horizontal rules
- Table of contents (auto-generated from headings)

**Migration Strategy**:
1. Create all database tables
2. Backfill 6 existing mock posts into `blog_posts`
3. Public routes (`/blog`, `/blog/[slug]`) read from database instead of mock data
4. Instructors can now create/edit posts via admin interface
5. Gradually deprecate `/src/data/blog-posts.ts`

**Success Metrics**:
- Instructors can create posts via Tiptap editor
- Posts persist to database
- Public blog routes display database content
- No mock data dependencies
- Image uploads work seamlessly
- All Phase 1-3 features work with database

---

## 📊 Expected Results

### After Phase 1:
- **Google**: Eligible for rich results
- **AI Systems**: Discoverable via RSS
- **Search Console**: Clean index status
- **Rich Snippets**: Article cards appear

### After Phase 2:
- **Google**: 2-3x more indexed pages
- **Rankings**: Improved for long-tail keywords
- **Authority**: E-E-A-T signals present
- **Internal Linking**: 50% improvement

### After Phase 3:
- **Google**: Top 10 rankings possible
- **AI Systems**: High-quality source
- **User Engagement**: 2x dwell time
- **Conversions**: Newsletter signups increase

### After Phase 4:
- **Content Creation**: Instructors can write posts without code changes
- **Scalability**: Unlimited posts without redeploying
- **Workflow**: Draft → Review → Publish flow
- **Media**: Image uploads integrated with existing media system
- **Maintenance**: No more editing `/src/data/blog-posts.ts`

---

## 🔧 Implementation Files

### Files to Create:

**Phase 1-3 (Mock Data):**
```
src/
  app/
    sitemap.ts                           # XML sitemap
    blog/
      rss.xml/
        route.ts                         # RSS feed
      category/
        [slug]/
          page.tsx                       # Category archive
      tag/
        [tag]/
          page.tsx                       # Tag pages
      [year]/
        page.tsx                         # Year archive
  lib/
    seo/
      structured-data.ts                 # JSON-LD generators
      meta-tags.ts                       # Meta tag helpers
      sitemap-generator.ts               # Sitemap utilities
      rss-generator.ts                   # RSS utilities
  components/
    blog/
      TableOfContents.tsx                # TOC component
      ReadingProgress.tsx                # Progress bar
      SocialProof.tsx                    # View/share counts
      EnhancedAuthorBio.tsx              # Enhanced author bio card
      RelatedPosts.tsx                   # Internal links
public/
  robots.txt                             # Crawl instructions
```

**Phase 4 (Database + Tiptap):**
```
src/
  app/
    instructor/
      blog/
        page.tsx                         # Blog post list (admin)
        new/
          page.tsx                       # Create new post
        [id]/
          edit/
            page.tsx                     # Edit post
    api/
      blog/
        posts/
          route.ts                       # CRUD operations
        upload-image/
          route.ts                       # Image uploads
        generate-slug/
          route.ts                       # Slug generator
  components/
    blog/
      TiptapEditor.tsx                   # Rich text editor
      TiptapRenderer.tsx                 # Render Tiptap JSON
      TiptapToolbar.tsx                  # Editor toolbar
      BlogPostCard.tsx                   # Admin list item
  lib/
    blog/
      tiptap-config.ts                   # Tiptap configuration
      content-generator.ts               # HTML from JSON
supabase/
  migrations/
    143_create_blog_system_tables.sql  # All 7 tables
    144_backfill_blog_posts.sql        # Transfer mock data
    145_add_author_bio_to_users.sql    # Author enhancements
```

### Files to Modify:

**Phase 1-3 (Mock Data):**
```
src/app/blog/[slug]/page.tsx             # Add structured data, enhanced author bio
src/app/blog/[slug]/blog-detail-client.tsx  # Add EnhancedAuthorBio component
src/app/blog/page.tsx                    # Add list schema
src/data/blog-posts.ts                   # Add updatedAt, expanded author fields
src/types/blog.ts                        # Add new fields (updatedAt, author.bio, author.social, etc.)
```

**Phase 4 (Database Migration):**
```
src/app/blog/page.tsx                    # Fetch from database instead of mock data
src/app/blog/[slug]/page.tsx             # Fetch from database instead of mock data
src/lib/supabase/queries.ts              # Add blog post queries
```

---

## 🎯 Quick Wins (Can Implement Today)

### 1-Hour Tasks:
- Add robots.txt
- Add canonical URLs
- Create basic sitemap

### 2-Hour Tasks:
- Add Article JSON-LD schema
- Create RSS feed
- Improve meta descriptions

### 4-Hour Tasks:
- Create enhanced author bio component
- Add table of contents
- Implement breadcrumb schema

---

## 📚 Resources

### Tools for Testing:
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)
- [RSS Feed Validator](https://www.feedvalidator.org/)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Ahrefs SEO Toolbar](https://ahrefs.com/seo-toolbar)

### Documentation:
- [Schema.org Article](https://schema.org/Article)
- [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google Search Central](https://developers.google.com/search)
- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)

---

## 🚀 Next Steps

1. **Review this document** with the team
2. **Start with Phase 1** - Implement critical SEO (mock data)
3. **Continue Phase 2-3** - Build UI features and discover requirements (mock data)
4. **Then Phase 4** - Design database schema based on finalized mock data structure
5. **Set up tracking** in Google Search Console
6. **Monitor results** weekly
7. **Iterate** based on performance data

## 📝 Implementation Workflow Summary

```
Phase 1-3 (Mock Data) → Discover exact requirements
        ↓
Phase 4 (Database) → Schema based on working implementation
        ↓
Result: Perfect database design, no refactoring
```

---

**Last Updated**: October 16, 2025
**Document Owner**: Engineering Team
**Review Frequency**: Monthly
