import type { SupportIndex, CompanyIndex, SupportArticle } from './support-types';

export async function getSupportIndex(): Promise<SupportIndex> {
  const data = await import('../../public/data/support/index.json');
  return data.default as SupportIndex;
}

export async function getCompanyIndex(company: string): Promise<CompanyIndex | null> {
  try {
    const data = await import(`../../public/data/support/${company}/index.json`);
    return data.default as CompanyIndex;
  } catch {
    return null;
  }
}

export async function getArticle(company: string, slug: string): Promise<SupportArticle | null> {
  try {
    const data = await import(`../../public/data/support/${company}/${slug}.json`);
    return data.default as SupportArticle;
  } catch {
    return null;
  }
}
