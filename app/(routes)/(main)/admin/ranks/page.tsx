import type { Metadata } from 'next';

import { AdminPage, CreateButton } from '@/components/admin/admin-page';
import { AdminSearchBar } from '@/components/admin/admin-search-bar';
import CreateRankDialog from '@/components/ranks/create-rank-dialog';
import { RanksTable } from '@/components/ranks/ranks-table';
import { getRanksPaginated } from '@/db/queries';
import { requireRole } from '@/lib/auth-check';
import { parsePaginationParams } from '@/lib/pagination';

export function generateMetadata(): Metadata {
  return {
    title: 'Ranks',
  };
}

interface RanksPageProps {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
}

export default async function RanksPage({ searchParams }: RanksPageProps) {
  await requireRole(['ranks']);

  const { page, search, limit } = await parsePaginationParams(searchParams);

  const { ranks, total } = await getRanksPaginated(page, limit, search);

  return (
    <AdminPage
      title="Ranks"
      description="Manage pilot ranks and their associated aircraft permissions"
      searchBar={<AdminSearchBar placeholder="Search rank..." />}
      createDialog={
        <CreateRankDialog>
          <CreateButton text="Add Rank" />
        </CreateRankDialog>
      }
      table={<RanksTable ranks={ranks} total={total} limit={limit} />}
    />
  );
}
