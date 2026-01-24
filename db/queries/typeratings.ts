import { eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import type { TypeRating, UserTypeRating } from '@/db/schema';
import {
  aircraft,
  typeRatingAircraft,
  typeRatings,
  userTypeRatings,
} from '@/db/schema';

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

async function getUserTypeRatings(userId: string): Promise<TypeRating[]> {
  const rows = await db
    .select({
      id: typeRatings.id,
      name: typeRatings.name,
      createdAt: typeRatings.createdAt,
      updatedAt: typeRatings.updatedAt,
    })
    .from(userTypeRatings)
    .innerJoin(typeRatings, eq(userTypeRatings.typeRatingId, typeRatings.id))
    .where(eq(userTypeRatings.userId, userId))
    .orderBy(typeRatings.name);

  return rows as TypeRating[];
}

async function getUserTypeRatingsPaginated(
  page: number,
  limit: number,
  search?: string
): Promise<{ userTypeRatings: UserTypeRating[]; total: number }> {
  const offset = (page - 1) * limit;

  const whereCondition = search
    ? sql<boolean>`${typeRatings.name} LIKE ${`%${search}%`} COLLATE NOCASE`
    : sql<boolean>`1 = 1`;

  const rows = await db
    .select({
      userTypeRating: userTypeRatings,
      totalCount: sql<number>`COUNT(*) OVER()`.as('totalCount'),
    })
    .from(userTypeRatings)
    .innerJoin(typeRatings, eq(userTypeRatings.typeRatingId, typeRatings.id))
    .where(whereCondition)
    .orderBy(typeRatings.name)
    .limit(limit)
    .offset(offset);

  return {
    userTypeRatings: rows.map((r) => r.userTypeRating),
    total: rows[0]?.totalCount ?? 0,
  };
}

async function getUserTypeRatingAircraft(userId: string): Promise<string[]> {
  const rows = await db
    .select({ aircraftId: aircraft.id })
    .from(aircraft)
    .innerJoin(
      typeRatingAircraft,
      eq(aircraft.id, typeRatingAircraft.aircraftId)
    )
    .innerJoin(
      userTypeRatings,
      eq(typeRatingAircraft.typeRatingId, userTypeRatings.typeRatingId)
    )
    .where(eq(userTypeRatings.userId, userId))
    .orderBy(aircraft.name);

  const unique = rows.filter(
    (row, index, self) =>
      index === self.findIndex((r) => r.aircraftId === row.aircraftId)
  );

  return unique.map((row) => row.aircraftId);
}

export {
  getTypeRatingAircraft,
  getTypeRatings,
  getTypeRatingsPaginated,
  getUserTypeRatingAircraft,
  getUserTypeRatings,
  getUserTypeRatingsPaginated,
};
