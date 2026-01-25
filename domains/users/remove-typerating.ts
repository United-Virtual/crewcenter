import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { userTypeRatings } from '@/db/schema';

interface RemoveTypeRatingData {
  userId: string;
  typeRatingId: string;
}

export async function removeTypeRating({
  userId,
  typeRatingId,
}: RemoveTypeRatingData) {
  const existing = await db
    .select()
    .from(userTypeRatings)
    .where(
      and(
        eq(userTypeRatings.userId, userId),
        eq(userTypeRatings.typeRatingId, typeRatingId)
      )
    )
    .get();

  if (!existing) {
    return { message: 'Type rating already removed' };
  }

  await db
    .delete(userTypeRatings)
    .where(
      and(
        eq(userTypeRatings.userId, userId),
        eq(userTypeRatings.typeRatingId, typeRatingId)
      )
    );

  return { message: 'Type rating removed successfully' };
}
