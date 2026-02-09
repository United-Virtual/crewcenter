'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { removeTypeRating } from '@/domains/users/remove-typerating';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const removeTypeRatingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  typeRatingId: z.string().min(1, 'Type rating ID is required'),
});

export const removeTypeRatingAction = createRoleActionClient(['users', 'admin'])
  .inputSchema(removeTypeRatingSchema)
  .action(async ({ parsedInput }) => {
    const { userId, typeRatingId } = parsedInput;

    try {
      const result = await removeTypeRating({ userId, typeRatingId });

      revalidatePath('/admin/users');
      revalidatePath(`/admin/users/${userId}`);

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to remove type rating',
      });
    }
  });
