'use server';

import { z } from 'zod';

import { getTypeRatingAircraft } from '@/domains/typerating/get-typerating-aircraft';
import { createRoleActionClient } from '@/lib/safe-action';

const getTypeRatingAircraftSchema = z.object({
  typeRatingId: z.string(),
});

export const getTypeRatingAircraftAction = createRoleActionClient(['admin'])
  .inputSchema(getTypeRatingAircraftSchema)
  .action(async ({ parsedInput: { typeRatingId } }) => {
    try {
      const result = await getTypeRatingAircraft(typeRatingId);
      return { success: true, ...result };
    } catch {
      return { success: false, error: 'Failed to fetch type rating aircraft' };
    }
  });
