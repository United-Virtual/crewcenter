import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { logPirepEvent } from '@/db/queries/pireps';
import { getCareerMinutesForUser } from '@/db/queries/users';
import { flightTimeLedger, pireps } from '@/db/schema';
import { resolvePirepFlightTimeCategory } from '@/domains/pireps/flight-time-category';
import { createFlightTimeLedgerEntry } from '@/lib/flight-time-ledger';
import { maybeScheduleRankup } from '@/lib/rankup-trigger';

type PirepStatus = 'pending' | 'approved' | 'denied';

async function updatePirepStatusInDb(
  pirepId: string,
  status: PirepStatus,
  deniedReason?: string | null
): Promise<void> {
  await db
    .update(pireps)
    .set({
      status,
      deniedReason: status === 'denied' ? (deniedReason ?? '') : '',
      updatedAt: new Date(),
    })
    .where(eq(pireps.id, pirepId));
}

async function updateBulkPirepStatusInDb(
  pirepIds: string[],
  status: PirepStatus,
  deniedReason?: string | null
): Promise<void> {
  await db
    .update(pireps)
    .set({
      status,
      deniedReason: status === 'denied' ? (deniedReason ?? '') : '',
      updatedAt: new Date(),
    })
    .where(inArray(pireps.id, pirepIds));
}

export async function updatePirepStatus(
  pirepId: string,
  newStatus: PirepStatus,
  performedBy: string,
  deniedReason?: string | null
) {
  if (
    newStatus === 'denied' &&
    (!deniedReason || deniedReason.trim().length === 0)
  ) {
    throw new Error('Denied reason is required when status is denied');
  }

  const pirepData = await db
    .select({
      userId: pireps.userId,
      flightTime: pireps.flightTime,
      status: pireps.status,
      deniedReason: pireps.deniedReason,
      aircraftId: pireps.aircraftId,
    })
    .from(pireps)
    .where(eq(pireps.id, pirepId))
    .get();

  if (!pirepData) {
    throw new Error('PIREP not found');
  }

  await updatePirepStatusInDb(pirepId, newStatus, deniedReason);

  const previousValues = {
    status: pirepData.status,
    deniedReason: pirepData.deniedReason,
  };

  const newValues = {
    status: newStatus,
    deniedReason: newStatus === 'denied' ? deniedReason : null,
  };

  await logPirepEvent(
    pirepId,
    newStatus,
    performedBy,
    newStatus === 'denied' ? (deniedReason ?? undefined) : undefined,
    previousValues,
    newValues
  );

  if (newStatus === 'approved' && pirepData.status !== 'approved') {
    const category = await resolvePirepFlightTimeCategory(
      pirepData.userId,
      pirepData.aircraftId
    );
    await createFlightTimeLedgerEntry({
      userId: pirepData.userId,
      minutes: pirepData.flightTime,
      category,
      sourceType: 'pirep',
      pirepId,
    });
  }

  if (pirepData.status === 'approved' && newStatus !== 'approved') {
    const lastCategory =
      (
        await db
          .select({ category: flightTimeLedger.category })
          .from(flightTimeLedger)
          .where(eq(flightTimeLedger.pirepId, pirepId))
          .orderBy(desc(flightTimeLedger.createdAt))
          .get()
      )?.category ?? null;
    const category =
      lastCategory ??
      (await resolvePirepFlightTimeCategory(
        pirepData.userId,
        pirepData.aircraftId
      ));
    await createFlightTimeLedgerEntry({
      userId: pirepData.userId,
      minutes: -pirepData.flightTime,
      category,
      sourceType: 'pirep_adjustment',
      pirepId,
      note: 'PIREP unapproved',
    });
  }

  if (newStatus === 'approved' && pirepData.status !== 'approved') {
    const totalFlightTime = await getCareerMinutesForUser(pirepData.userId);
    maybeScheduleRankup(
      pirepData.userId,
      totalFlightTime - pirepData.flightTime,
      totalFlightTime
    );
  }

  return pirepData;
}

export async function updateBulkPirepStatus(
  pirepIds: string[],
  performedBy: string
) {
  if (pirepIds.length === 0) {
    throw new Error('At least one PIREP ID is required');
  }

  const pirepsData = await db
    .select({
      id: pireps.id,
      userId: pireps.userId,
      flightTime: pireps.flightTime,
      status: pireps.status,
      deniedReason: pireps.deniedReason,
      aircraftId: pireps.aircraftId,
    })
    .from(pireps)
    .where(inArray(pireps.id, pirepIds));

  if (pirepsData.length === 0) {
    throw new Error('No PIREPs found');
  }

  if (pirepsData.length !== pirepIds.length) {
    throw new Error('Some PIREPs were not found');
  }

  await updateBulkPirepStatusInDb(pirepIds, 'approved', null);

  for (const pirepData of pirepsData) {
    const previousValues = {
      status: pirepData.status,
      deniedReason: pirepData.deniedReason,
    };

    const newValues = {
      status: 'approved',
      deniedReason: null,
    };

    await logPirepEvent(
      pirepData.id,
      'approved',
      performedBy,
      undefined,
      previousValues,
      newValues
    );

    // Schedule rankup for approved PIREPs that weren't already approved
    if (pirepData.status !== 'approved') {
      const category = await resolvePirepFlightTimeCategory(
        pirepData.userId,
        pirepData.aircraftId
      );
      await createFlightTimeLedgerEntry({
        userId: pirepData.userId,
        minutes: pirepData.flightTime,
        category,
        sourceType: 'pirep',
        pirepId: pirepData.id,
      });

      const totalFlightTime = await getCareerMinutesForUser(pirepData.userId);
      maybeScheduleRankup(
        pirepData.userId,
        totalFlightTime - pirepData.flightTime,
        totalFlightTime
      );
    }
  }

  return pirepsData;
}
