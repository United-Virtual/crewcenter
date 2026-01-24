import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { typeRatingAircraft, typeRatings } from '@/db/schema';

export async function getTypeRatingAircraft(typeRatingId: string) {
  const typeRating = await db
    .select({ id: typeRatings.id })
    .from(typeRatings)
    .where(eq(typeRatings.id, typeRatingId))
    .get();

  if (!typeRating) {
    throw new Error('Type rating not found');
  }

  const aircraftIds = await db
    .select({ aircraftId: typeRatingAircraft.aircraftId })
    .from(typeRatingAircraft)
    .where(eq(typeRatingAircraft.typeRatingId, typeRatingId));

  return {
    aircraftIds: aircraftIds.map((a) => a.aircraftId),
  };
}
