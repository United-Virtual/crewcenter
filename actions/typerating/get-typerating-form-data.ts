'use server';

import { getAircraft } from '@/db/queries';
import { createRoleActionClient } from '@/lib/safe-action';

export const getTypeRatingFormDataAction = createRoleActionClient([
  'admin',
]).action(async () => {
  const aircraft = await getAircraft();

  return {
    aircraft,
  };
});
