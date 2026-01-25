import type { Metadata } from 'next';

import { AdminPage, CreateButton } from '@/components/admin/admin-page';
import { AdminSearchBar } from '@/components/admin/admin-search-bar';
import CreateTypeRatingDialog from '@/components/typerating/create-typerating-dialog';
import { TypeRatingsTable } from '@/components/typerating/typeratings-table';
import { getTypeRatingsPaginated } from '@/db/queries';
import { requireRole } from '@/lib/auth-check';
import { parsePaginationParams } from '@/lib/pagination';

export function generateMetadata(): Metadata {
  return {
    title: 'Type Ratings',
  };
}

interface TypeRatingsPageProps {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
}

export default async function TypeRatingsPage({
  searchParams,
}: TypeRatingsPageProps) {
  await requireRole(['admin']);

  const { page, search, limit } = await parsePaginationParams(searchParams);
  const { typeRatings, total } = await getTypeRatingsPaginated(
    page,
    limit,
    search
  );

  return (
    <AdminPage
      title="Type Ratings"
      description="Manage pilot type ratings and their associated aircraft permissions"
      searchBar={<AdminSearchBar placeholder="Search type rating..." />}
      createDialog={
        <CreateTypeRatingDialog>
          <CreateButton text="Add Type Rating" />
        </CreateTypeRatingDialog>
      }
      table={
        <TypeRatingsTable
          typeRatings={typeRatings}
          total={total}
          limit={limit}
        />
      }
    />
  );
}
