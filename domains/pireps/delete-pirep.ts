import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { flightTimeLedger, pireps } from '@/db/schema';
import { resolvePirepFlightTimeCategory } from '@/domains/pireps/flight-time-category';
import { createFlightTimeLedgerEntry } from '@/lib/flight-time-ledger';
import { hasRequiredRole, parseRolesField } from '@/lib/roles';

export async function deletePirep(
  id: string,
  userId: string,
  userRolesRaw: string
): Promise<void> {
  const pirep = await db
    .select({
      id: pireps.id,
      status: pireps.status,
      userId: pireps.userId,
      flightTime: pireps.flightTime,
      aircraftId: pireps.aircraftId,
    })
    .from(pireps)
    .where(eq(pireps.id, id))
    .get();

  if (!pirep) {
    throw new Error('PIREP not found');
  }

  const userRoles = parseRolesField(userRolesRaw);
  const hasPirepsRole = hasRequiredRole(userRoles, ['pireps']);

  if (pirep.status === 'pending') {
    const isOwnPirep = pirep.userId === userId;
    if (!isOwnPirep && !hasPirepsRole) {
      throw new Error(
        'Access denied. You can only delete your own pending PIREPs or need the pireps role'
      );
    }
  } else {
    if (!hasPirepsRole) {
      throw new Error(
        'Access denied. Only users with the pireps role can delete non-pending PIREPs'
      );
    }
  }

  if (pirep.status === 'approved') {
    const lastCategory =
      (
        await db
          .select({ category: flightTimeLedger.category })
          .from(flightTimeLedger)
          .where(eq(flightTimeLedger.pirepId, id))
          .orderBy(desc(flightTimeLedger.createdAt))
          .get()
      )?.category ?? null;
    const category =
      lastCategory ??
      (await resolvePirepFlightTimeCategory(pirep.userId, pirep.aircraftId));
    await createFlightTimeLedgerEntry({
      userId: pirep.userId,
      minutes: -pirep.flightTime,
      category,
      sourceType: 'pirep_adjustment',
      pirepId: id,
      note: 'PIREP deleted',
    });
  }

  const result = await db.delete(pireps).where(eq(pireps.id, id));

  if (result.rowsAffected === 0) {
    throw new Error('Failed to delete PIREP - no changes made');
  }
}
