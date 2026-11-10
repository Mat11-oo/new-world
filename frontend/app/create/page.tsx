import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = 'force-dynamic';

export default async function CreateRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  redirect(`/workbench${suffix ? `?${suffix}` : ''}#composer`);
}
