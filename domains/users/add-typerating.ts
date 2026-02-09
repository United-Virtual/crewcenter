import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { getAirline } from '@/db/queries/airline';
import { getCareerMinutesForUser } from '@/db/queries/users';
import { users } from '@/db/schema';
import { createFlightTimeLedgerEntry } from '@/lib/flight-time-ledger';

interface AddTypeRatingData {
  userId: string;
  typeRatingId: string;
}

export async function addTypeRating({
  userId,
  typeRatingId,
}: AddTypeRatingData) {
  const current = await db
    .select({ id: users.id, typeRatingId: users.typeRatingId })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!current) {
    throw new Error('User not found');
  }

  const airlineSettings = await getAirline();
  const typeRatingChangeDivisor = airlineSettings?.typeRatingChangeDivisor ?? 1;

  if (current.typeRatingId === typeRatingId) {
    throw new Error('User already has this type rating');
  }

  if (current.typeRatingId) {
    const divisor = typeRatingChangeDivisor > 0 ? typeRatingChangeDivisor : 1;
    const currentCareerMinutes = await getCareerMinutesForUser(userId);
    const newCareerMinutes = Math.round(currentCareerMinutes / divisor);
    const adjustment = newCareerMinutes - currentCareerMinutes;

    await db
      .update(users)
      .set({ typeRatingId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    if (adjustment !== 0) {
      await createFlightTimeLedgerEntry({
        userId,
        minutes: adjustment,
        category: 'career',
        sourceType: 'type_rating_change',
        note: `Type rating switch divisor applied (x${divisor})`,
      });
    }

    return { message: 'Type rating switched successfully' };
  }

  await db
    .update(users)
    .set({ typeRatingId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { message: 'Type rating added successfully' };
}
