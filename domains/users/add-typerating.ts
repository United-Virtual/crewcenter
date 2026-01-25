import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users, userTypeRatings } from '@/db/schema';

interface AddTypeRatingData {
  userId: string;
  typeRatingId: string;
}

export async function addTypeRating({
  userId,
  typeRatingId,
}: AddTypeRatingData) {
  const current = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!current) {
    throw new Error('User not found');
  }

  // check if the user already has this type rating
  const currentTypeRatings = await db
    .select()
    .from(userTypeRatings)
    .where(eq(userTypeRatings.userId, userId))
    .all();

  if (currentTypeRatings.some((t) => t.typeRatingId === typeRatingId)) {
    throw new Error('User already has this type rating');
  }

  await db.insert(userTypeRatings).values({
    id: crypto.randomUUID(),
    userId,
    typeRatingId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { message: 'Type rating added successfully' };
}
