import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';

interface RemoveTypeRatingData {
  userId: string;
  typeRatingId: string;
}

export async function removeTypeRating({
  userId,
  typeRatingId,
}: RemoveTypeRatingData) {
  const existing = await db
    .select({ typeRatingId: users.typeRatingId })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!existing) {
    throw new Error('User not found');
  }

  if (!existing.typeRatingId || existing.typeRatingId !== typeRatingId) {
    return { message: 'Type rating already removed' };
  }

  await db
    .update(users)
    .set({ typeRatingId: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { message: 'Type rating removed successfully' };
}
