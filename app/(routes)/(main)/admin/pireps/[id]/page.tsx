import { redirect } from 'next/navigation';

import { PirepDetails } from '@/components/logbook/pirep-details';
import { AdminPirepStatusButtons } from '@/components/pireps/admin-pirep-status-buttons';
import {
  getAircraft,
  getAirportInfoByIcao,
  getMultipliers,
  getPirepById,
} from '@/db/queries';
import { getAirline } from '@/db/queries/airline';
import { resolvePirepFlightTimeCategory } from '@/domains/pireps/flight-time-category';
import { authCheck, requireRole } from '@/lib/auth-check';
import { parseRolesField } from '@/lib/roles';

export default async function AdminPirepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['pireps']);
  const session = await authCheck();

  const { id } = await params;
  const pirepData = await getPirepById(id);

  if (!pirepData) {
    redirect('/admin/pireps');
  }

  const { pirep, aircraft, multiplier, user } = pirepData;

  const departureInfo = await getAirportInfoByIcao(pirep.departureIcao);
  const arrivalInfo = await getAirportInfoByIcao(pirep.arrivalIcao);

  const aircraftList = await getAircraft();
  const multipliersList = await getMultipliers();
  const airline = await getAirline();

  const userRoles = parseRolesField(session.user.role);
  const flightTimeCategory =
    pirep.flightTimeCategory ??
    (await resolvePirepFlightTimeCategory(pirep.userId, pirep.aircraftId));
  const pirepWithCategory = { ...pirep, flightTimeCategory };

  return (
    <PirepDetails
      pirep={pirepWithCategory}
      aircraft={aircraft}
      multiplier={multiplier}
      user={user}
      isAdmin={true}
      isEditable={true}
      adminActionButtons={
        <AdminPirepStatusButtons
          pirepId={pirep.id}
          currentStatus={pirep.status as 'pending' | 'approved' | 'denied'}
        />
      }
      backHref="/admin/pireps"
      backLabel="Back to PIREPs"
      aircraftList={aircraftList}
      multipliersList={multipliersList}
      departureName={departureInfo?.name ?? undefined}
      arrivalName={arrivalInfo?.name ?? undefined}
      departureCountry={departureInfo?.country ?? undefined}
      arrivalCountry={arrivalInfo?.country ?? undefined}
      airline={airline}
      currentUserId={session.user.id}
      userRoles={userRoles}
    />
  );
}
