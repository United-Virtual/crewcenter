import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { routeAircraft, routes, routesFlightNumbers } from '@/db/schema';

export async function deleteRoute(id: string) {
  await db.transaction(async (tx) => {
    await tx.delete(routeAircraft).where(eq(routeAircraft.routeId, id));
    await tx
      .delete(routesFlightNumbers)
      .where(eq(routesFlightNumbers.routeId, id));
    await tx.delete(routes).where(eq(routes.id, id));
  });
}

export async function deleteRoutesByIds(ids: string[]) {
  if (ids.length === 0) {
    return { deleted: 0 };
  }

  const chunkSize = 500;
  let totalDeleted = 0;

  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await tx
        .delete(routeAircraft)
        .where(inArray(routeAircraft.routeId, chunk));
      await tx
        .delete(routesFlightNumbers)
        .where(inArray(routesFlightNumbers.routeId, chunk));
      await tx.delete(routes).where(inArray(routes.id, chunk));
      totalDeleted += chunk.length;
    }
  });

  return { deleted: totalDeleted };
}
