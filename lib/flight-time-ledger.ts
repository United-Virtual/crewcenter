import { db } from '@/db';
import { flightTimeLedger } from '@/db/schema';

export type FlightTimeCategory = 'career' | 'free_fly';
export type FlightTimeSourceType =
  | 'pirep'
  | 'manual'
  | 'type_rating_change'
  | 'pirep_adjustment';

interface FlightTimeLedgerEntry {
  userId: string;
  minutes: number;
  category: FlightTimeCategory;
  sourceType: FlightTimeSourceType;
  pirepId?: string | null;
  note?: string | null;
}

export async function createFlightTimeLedgerEntry(
  entry: FlightTimeLedgerEntry
): Promise<void> {
  await db.insert(flightTimeLedger).values({
    id: crypto.randomUUID(),
    userId: entry.userId,
    minutes: entry.minutes,
    category: entry.category,
    sourceType: entry.sourceType,
    pirepId: entry.pirepId ?? null,
    note: entry.note ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
