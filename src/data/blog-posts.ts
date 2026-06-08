export const BLOG_POST_SLUGS = {
  careRitual: "rytual-pielegnacji-bizuterii",
  layeredCompositions: "sztuka-proporcji-warstwowe-kompozycje",
  mineralGuide: "przewodnik-po-mineralach"
} as const;

export type BlogPostSlug = (typeof BLOG_POST_SLUGS)[keyof typeof BLOG_POST_SLUGS];

const BLOG_POST_SLUG_SET = new Set<string>(Object.values(BLOG_POST_SLUGS));

export function isBlogPostSlug(slug: string): slug is BlogPostSlug {
  return BLOG_POST_SLUG_SET.has(slug);
}

export const LANDING_ARCHIVE_ARTICLES = [
  { slug: BLOG_POST_SLUGS.careRitual, titleKey: "articles.golden" },
  { slug: BLOG_POST_SLUGS.layeredCompositions, titleKey: "articles.sustainability" },
  { slug: BLOG_POST_SLUGS.mineralGuide, titleKey: "articles.engraving" }
] as const;

export const BLOG_POST_SLUG_LIST: readonly BlogPostSlug[] = LANDING_ARCHIVE_ARTICLES.map((article) => article.slug);
