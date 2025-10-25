'use server';

import { getAircraft, getMultipliers } from '@/db/queries';
import { authActionClient } from '@/lib/safe-action';

export const getEventFormDataAction = authActionClient.action(async () => {
  const [aircraft, multipliers] = await Promise.all([
    getAircraft(),
    getMultipliers(),
  ]);

  return {
    aircraft,
    multipliers,
  };
});
