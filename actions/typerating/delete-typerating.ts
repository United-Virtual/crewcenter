'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { deleteTypeRating } from '@/domains/typerating/delete-typerating';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const deleteTypeRatingSchema = z.object({
  id: z.string().min(1, 'Type rating ID is required'),
});

const deleteBulkTypeRatingsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const deleteTypeRatingAction = createRoleActionClient(['admin'])
  .inputSchema(deleteTypeRatingSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const deletedTypeRating = await deleteTypeRating(id);

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: 'Type rating deleted successfully',
        deletedTypeRating,
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete type rating',
        constraint:
          'Cannot delete type rating - it is being used by users or aircraft',
        reference:
          'Cannot delete type rating - it has associated data that must be removed first',
      });
    }
  });

export const deleteBulkTypeRatingsAction = createRoleActionClient(['admin'])
  .inputSchema(deleteBulkTypeRatingsSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      await Promise.all(ids.map((id) => deleteTypeRating(id)));

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: `${ids.length} type rating${
          ids.length === 1 ? '' : 's'
        } deleted successfully`,
      };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete type ratings',
        constraint:
          'Cannot delete type ratings - they are being used by users or aircraft',
        reference:
          'Cannot delete type ratings - they have associated data that must be removed first',
      });
    }
  });
