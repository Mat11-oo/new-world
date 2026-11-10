import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

export const dynamic = 'force-dynamic';

export default async function SandboxPage({
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
  query.set('tools', '1');
  redirect(`/workbench?${query.toString()}`);
}
