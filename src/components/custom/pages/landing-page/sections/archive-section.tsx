import type { JSX } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { getAssetURL } from "~/src/lib/utils";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { LANDING_ARCHIVE_ARTICLES } from "~/src/data/landing-data";

const ASPECT_RATIO_PORTRAIT = 0.8;

type ArchiveArticle = (typeof LANDING_ARCHIVE_ARTICLES)[number];

interface ArticleLinkProps {
  article: ArchiveArticle;
}

function ArchiveArticleItem({ article }: Readonly<ArticleLinkProps>): JSX.Element {
  const t = useTranslations("pages.landing.archiveSection");
  return (
    <li>
      <LocalizedLink
        className="group flex items-center justify-between py-5 text-lg transition-colors hover:text-muted-foreground"
        to={article.href}
      >
        <span>{t(article.titleKey)}</span>
        <ArrowRight className="transition-transform duration-500 group-hover:translate-x-1" />
      </LocalizedLink>
    </li>
  );
}

export function ArchiveSection(): JSX.Element {
  const t = useTranslations("pages.landing.archiveSection");

  return (
    <section className="mx-auto max-w-400 px-6 py-16 lg:px-12 lg:py-24">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-12">
        <AspectRatio className="parallax-wrap reveal overflow-hidden bg-card" ratio={ASPECT_RATIO_PORTRAIT}>
          <div className="parallax-img absolute inset-x-0 top-[-8%] bottom-[-8%]">
            <Image
              alt={t("imageAlt")}
              className="absolute inset-0 size-full object-cover"
              height={1600}
              sizes="(max-width: 1024px) 100vw, 45vw"
              src={getAssetURL("marketing/editorial.webp")}
              width={1280}
            />
          </div>
        </AspectRatio>
        <div className="reveal space-y-5">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-5xl leading-[0.98]">{t("title")}</h2>
          <ul className="divide-y divide-border border-y border-border">
            {LANDING_ARCHIVE_ARTICLES.map((a) => (
              <ArchiveArticleItem key={a.titleKey} article={a} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
