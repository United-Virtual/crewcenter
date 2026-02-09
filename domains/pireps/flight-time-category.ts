import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { getAirline } from '@/db/queries/airline';
import { getUserTypeRatingId } from '@/db/queries/typeratings';
import { typeRatingAircraft } from '@/db/schema';
import type { FlightTimeCategory } from '@/lib/flight-time-ledger';

export async function resolvePirepFlightTimeCategory(
  userId: string,
  aircraftId: string | null
): Promise<FlightTimeCategory> {
  if (!aircraftId) {
    return 'free_fly';
  }

  const airlineSettings = await getAirline();
  const enforceTypeRatings = airlineSettings?.enforceTypeRatings ?? false;

  if (!enforceTypeRatings) {
    return 'free_fly';
  }

  const typeRatingId = await getUserTypeRatingId(userId);
  if (!typeRatingId) {
    return 'free_fly';
  }

  const matching = await db
    .select({ aircraftId: typeRatingAircraft.aircraftId })
    .from(typeRatingAircraft)
    .where(
      and(
        eq(typeRatingAircraft.typeRatingId, typeRatingId),
        eq(typeRatingAircraft.aircraftId, aircraftId)
      )
    )
    .get();

  return matching ? 'career' : 'free_fly';
}
