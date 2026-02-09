'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { addTypeRating } from '@/domains/users/add-typerating';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const addTypeRatingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  typeRatingId: z.string().min(1, 'Type rating ID is required'),
});

export const addTypeRatingAction = createRoleActionClient(['users', 'admin'])
  .inputSchema(addTypeRatingSchema)
  .action(async ({ parsedInput }) => {
    const { userId, typeRatingId } = parsedInput;

    try {
      const result = await addTypeRating({ userId, typeRatingId });

      revalidatePath('/admin/users');
      revalidatePath(`/admin/users/${userId}`);

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to add type rating',
      });
    }
  });
