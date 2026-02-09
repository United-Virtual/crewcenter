import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { typeRatingAircraft, typeRatings } from '@/db/schema';

interface EditTypeRatingData {
  id: string;
  name: string;
  aircraftIds: string[];
}

export async function editTypeRating(data: EditTypeRatingData) {
  await db
    .update(typeRatings)
    .set({ name: data.name, updatedAt: new Date() })
    .where(eq(typeRatings.id, data.id));

  await db
    .delete(typeRatingAircraft)
    .where(eq(typeRatingAircraft.typeRatingId, data.id));

  const typeRatingAircraftEntries = data.aircraftIds.map((aircraftId) => ({
    id: crypto.randomUUID(),
    typeRatingId: data.id,
    aircraftId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.insert(typeRatingAircraft).values(typeRatingAircraftEntries);
}
