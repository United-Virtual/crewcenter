import { db } from '@/db';
import { typeRatingAircraft, typeRatings } from '@/db/schema';

interface CreateTypeRatingData {
  name: string;
  aircraftIds: string[];
}

export async function createTypeRating(data: CreateTypeRatingData) {
  const typeRatingId = crypto.randomUUID();

  const [newTypeRating] = await db
    .insert(typeRatings)
    .values({
      id: typeRatingId,
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  const typeRatingAircraftEntries = data.aircraftIds.map((aircraftId) => ({
    id: crypto.randomUUID(),
    typeRatingId,
    aircraftId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.insert(typeRatingAircraft).values(typeRatingAircraftEntries);

  return newTypeRating;
}
