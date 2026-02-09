import { eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import type { TypeRating } from '@/db/schema';
import { aircraft, typeRatingAircraft, typeRatings, users } from '@/db/schema';

async function getTypeRatingsPaginated(
  page: number,
  limit: number,
  search?: string
): Promise<{ typeRatings: TypeRating[]; total: number }> {
  const offset = (page - 1) * limit;

  const whereCondition = search
    ? sql<boolean>`${typeRatings.name} LIKE ${`%${search}%`} COLLATE NOCASE`
    : sql<boolean>`1 = 1`;

  const rows = await db
    .select({
      typeRating: typeRatings,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(typeRatings)
    .where(whereCondition)
    .orderBy(typeRatings.name)
    .limit(limit)
    .offset(offset);

  return {
    typeRatings: rows.map((r) => r.typeRating),
    total: rows[0]?.totalCount ?? 0,
  };
}

async function getTypeRatings(): Promise<TypeRating[]> {
  return db.select().from(typeRatings).orderBy(typeRatings.name);
}

async function getTypeRatingAircraft(typeRatingId: string): Promise<string[]> {
  const rows = await db
    .select({ aircraftId: typeRatingAircraft.aircraftId })
    .from(typeRatingAircraft)
    .where(eq(typeRatingAircraft.typeRatingId, typeRatingId));

  return rows.map((row) => row.aircraftId);
}

async function getUserTypeRating(userId: string): Promise<TypeRating | null> {
  const row = await db
    .select({ typeRating: typeRatings })
    .from(users)
    .leftJoin(typeRatings, eq(users.typeRatingId, typeRatings.id))
    .where(eq(users.id, userId))
    .get();

  return row?.typeRating ?? null;
}

async function getUserTypeRatingId(userId: string): Promise<string | null> {
  const row = await db
    .select({ typeRatingId: users.typeRatingId })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  return row?.typeRatingId ?? null;
}

async function getUserTypeRatingAircraft(userId: string): Promise<string[]> {
  const user = await db
    .select({ typeRatingId: users.typeRatingId })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user?.typeRatingId) {
    return [];
  }

  const rows = await db
    .select({ aircraftId: aircraft.id })
    .from(aircraft)
    .innerJoin(
      typeRatingAircraft,
      eq(aircraft.id, typeRatingAircraft.aircraftId)
    )
    .where(eq(typeRatingAircraft.typeRatingId, user.typeRatingId))
    .orderBy(aircraft.name);

  return rows.map((row) => row.aircraftId);
}

export {
  getTypeRatingAircraft,
  getTypeRatings,
  getTypeRatingsPaginated,
  getUserTypeRating,
  getUserTypeRatingAircraft,
  getUserTypeRatingId,
};
