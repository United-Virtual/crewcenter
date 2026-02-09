import type { Metadata } from 'next';

import { EventBanner } from '@/components/dashboard/event-banner';
import { FlightsTable } from '@/components/dashboard/flights-table';
import { MetricCard } from '@/components/dashboard/metric-card';
import {
  getActiveEvents,
  getCareerMinutesForUser,
  getEventParticipants,
  getFreeFlyMinutesForUser,
  getTotalFlightsNumber,
  getUserLastFlights,
  getUserRank,
} from '@/db/queries';
import { authCheck } from '@/lib/auth-check';
import { formatHoursMinutes, getWelcomeMessage } from '@/lib/utils';

export function generateMetadata(): Metadata {
  return {
    title: 'Dashboard',
  };
}

export default async function DashboardPage() {
  const session = await authCheck();

  const userId = session.user.id;
  const [careerMinutes, freeFlyMinutes] = await Promise.all([
    getCareerMinutesForUser(userId),
    getFreeFlyMinutesForUser(userId),
  ]);

  const [totalFlights, lastFlights, rank] = await Promise.all([
    getTotalFlightsNumber(userId),
    getUserLastFlights(userId),
    getUserRank(careerMinutes),
  ]);

  const activeEvents = await getActiveEvents();
  const nowMs = Date.now();

  const currentlyHappening = activeEvents.find((e) => {
    const departureMs = new Date(e.departureTime).getTime();
    const arrivalMs = departureMs + e.flightTime * 60 * 1000;
    return nowMs >= departureMs && nowMs <= arrivalMs;
  });

  const within24h = !currentlyHappening
    ? activeEvents.find((e) => {
        const diffMs = new Date(e.departureTime).getTime() - nowMs;
        return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
      })
    : null;

  let bannerData: {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    departureTime: Date;
    departureIcao: string;
    arrivalIcao: string;
    participantsCount: number;
    isCurrentlyHappening?: boolean;
  } | null = null;

  // prioritize currently happening events over upcoming ones
  const eventToShow = currentlyHappening || within24h;

  if (eventToShow) {
    const participants = await getEventParticipants(eventToShow.id);
    bannerData = {
      id: eventToShow.id,
      title: eventToShow.title,
      description: eventToShow.description,
      imageUrl: eventToShow.imageUrl,
      departureTime: eventToShow.departureTime,
      departureIcao: eventToShow.departureIcao,
      arrivalIcao: eventToShow.arrivalIcao,
      participantsCount: participants.length,
      isCurrentlyHappening: !!currentlyHappening,
    };
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl lg:text-3xl">
            Hello {session.user.name},
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            {getWelcomeMessage()}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Career Hours"
          value={formatHoursMinutes(careerMinutes)}
        />
        <MetricCard
          title="Free Fly Hours"
          value={formatHoursMinutes(freeFlyMinutes)}
        />
        <MetricCard title="Total PIREPs" value={totalFlights.totalFlights} />
        <MetricCard title="Rank" value={rank?.name ?? 'N/A'} />
      </div>

      {bannerData && (
        <EventBanner
          id={bannerData.id}
          title={bannerData.title}
          description={bannerData.description}
          imageUrl={bannerData.imageUrl}
          departureTime={bannerData.departureTime}
          departureIcao={bannerData.departureIcao}
          arrivalIcao={bannerData.arrivalIcao}
          participantsCount={bannerData.participantsCount}
          isCurrentlyHappening={bannerData.isCurrentlyHappening}
        />
      )}

      <div>
        <h2 className="mb-4 font-medium text-foreground text-lg sm:mb-5">
          Last PIREPs
        </h2>
        <FlightsTable flights={lastFlights} />
      </div>
    </div>
  );
}
