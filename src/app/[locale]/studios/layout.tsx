import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SITE_URL } from '@/lib/seo';

/** Title, description and hreflang alternates of the "For nail studios" page. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'studios' });
  return {
    title: t('metaTitle'),
    description: t('metaDesc'),
    alternates: {
      canonical: `${SITE_URL}/${locale}/studios`,
      languages: {
        en: `${SITE_URL}/en/studios`,
        tr: `${SITE_URL}/tr/studios`,
      },
    },
  };
}

export default function StudiosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
