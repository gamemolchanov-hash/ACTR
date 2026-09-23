import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/** The unsubscribe page is personal (reached by an email token): keep it out of the index. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('unsubscribe');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
