import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { typeRatings } from '@/db/schema';

export async function deleteTypeRating(id: string) {
  const existingTypeRating = await db
    .select()
    .from(typeRatings)
    .where(eq(typeRatings.id, id))
    .limit(1);

  if (existingTypeRating.length === 0) {
    throw new Error('Type rating not found');
  }

  await db.delete(typeRatings).where(eq(typeRatings.id, id));

  return existingTypeRating[0];
}
