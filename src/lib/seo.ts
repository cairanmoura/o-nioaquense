/**
 * seo.ts
 * -----------------------------------------------------------------------------
 * Metadados de SEO, Open Graph e Schema.org.
 *
 * O `NewsArticle` e' o schema que o Google Noticias e o Google Discover usam
 * para/indexar materias (com `headline`, `datePublished`, `author` e `image`).
 */

export interface SeoInput {
  title: string;
  description: string;
  /** URL canonica absoluta. */
  url: string;
  image?: string | null;
  type?: 'website' | 'article';
  publishedAt?: string | null;
  modifiedAt?: string | null;
  authorName?: string | null;
  authorUrl?: string | null;
  /** Editoria / secao (ex.: "Nioaque", "Radar Oficial"). */
  section?: string | null;
  keywords?: string[];
  noindex?: boolean;
  /** Contem o JSON-LD? */
  jsonLd?: boolean;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string | null;
  ogSiteName: string;
  ogLocale: string;
  articlePublishedTime: string | null;
  articleModifiedTime: string | null;
  articleSection: string | null;
  articleAuthor: string | null;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string | null;
  robots: string;
  jsonLd: string | null;
}

const SITE_NAME = 'O Nioaquense';
const DEFAULT_IMAGE = '/icons/icon-512.png';

export function buildSeo(input: SeoInput): SeoMeta {
  const image = input.image ?? DEFAULT_IMAGE;
  const published = input.publishedAt ?? null;
  const modified = input.modifiedAt ?? published;

  const jsonLd =
    input.jsonLd === false || input.type !== 'article'
      ? null
      : JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: input.title,
          description: input.description,
          image: [image],
          datePublished: published,
          dateModified: modified,
          author: input.authorName
            ? {
                '@type': 'Person',
                name: input.authorName,
                ...(input.authorUrl ? { url: input.authorUrl } : {}),
              }
            : { '@type': 'Organization', name: SITE_NAME },
          publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: input.url.split('/noticia/')[0] ?? input.url,
          },
          mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
          ...(input.section ? { articleSection: input.section } : {}),
          ...(input.keywords?.length ? { keywords: input.keywords.join(', ') } : {}),
          isAccessibleForFree: true,
          inLanguage: 'pt-BR',
        });

  return {
    title: input.title,
    description: input.description,
    canonical: input.url,
    ogType: input.type ?? 'website',
    ogTitle: input.title,
    ogDescription: input.description,
    ogUrl: input.url,
    ogImage: image,
    ogSiteName: SITE_NAME,
    ogLocale: 'pt_BR',
    articlePublishedTime: published,
    articleModifiedTime: modified,
    articleSection: input.section ?? null,
    articleAuthor: input.authorName ?? null,
    twitterCard: image ? 'summary_large_image' : 'summary',
    twitterTitle: input.title,
    twitterDescription: input.description,
    twitterImage: image,
    robots: input.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    jsonLd,
  };
}

/** Descricao curta (ate 160 caracteres), cortada em palavra inteira. */
export function excerpt(text: string, max = 160): string {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
