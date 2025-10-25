import { Plus } from 'lucide-react';
import type { Metadata } from 'next';

import CreateEventDialog from '@/components/events/create-event-dialog';
import { EventsTable } from '@/components/events/events-table';
import { PageLayout } from '@/components/page-layout';
import { Button } from '@/components/ui/button';
import {
  getAircraft,
  getEventParticipantCounts,
  getEventsByStatus,
  getEventsPaginated,
  getMultipliers,
} from '@/db/queries';
import { requireRole } from '@/lib/auth-check';
import { parsePaginationParams } from '@/lib/pagination';

export function generateMetadata(): Metadata {
  return {
    title: 'Events',
  };
}

interface EventsPageProps {
  searchParams?: Promise<{
    page?: string;
    status?: string;
  }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  await requireRole(['events']);

  const resolvedSearchParams =
    (searchParams ? await searchParams : undefined) ?? {};
  const { page, limit } = await parsePaginationParams(searchParams);

  const status = resolvedSearchParams?.status;

  let events;
  let total;

  if (status) {
    events = await getEventsByStatus(status);
    total = events.length;
  } else {
    const eventsData = await getEventsPaginated(page, limit);
    events = eventsData.events;
    total = eventsData.total;
  }

  const countsByEventId = await getEventParticipantCounts(
    events.map((e) => e.id)
  );
  const eventsWithParticipants = events
    .map((event) => ({
      ...event,
      participantsCount: countsByEventId[event.id] ?? 0,
    }))
    .sort((a, b) => Number(a.departureTime) - Number(b.departureTime));

  const [aircraft, multipliers] = await Promise.all([
    getAircraft(),
    getMultipliers(),
  ]);

  return (
    <PageLayout
      title="Events"
      description="Create and manage flight events to engage your pilot community"
      headerRight={
        <>
          <CreateEventDialog>
            <Button className="gap-2" size="default">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </CreateEventDialog>
        </>
      }
    >
      <EventsTable
        events={eventsWithParticipants}
        total={total}
        limit={limit}
        aircraft={aircraft}
        multipliers={multipliers}
      />
    </PageLayout>
  );
}
