'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { editTypeRating } from '@/domains/typerating/edit-typerating';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const editTypeRatingSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .min(1, 'Type rating name is required')
    .max(15, 'Type rating name must be 15 characters or less'),
  aircraftIds: z.array(z.string()).min(1, 'Select at least one aircraft'),
});

export const editTypeRatingAction = createRoleActionClient(['admin'])
  .inputSchema(editTypeRatingSchema)
  .action(async ({ parsedInput: { id, name, aircraftIds } }) => {
    try {
      await editTypeRating({
        id,
        name: name.trim(),
        aircraftIds,
      });

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: 'Type rating updated successfully',
      };
    } catch (error) {
      handleDbError(error, {
        unique: {
          name: 'A type rating with this name already exists',
        },
        fallback: 'Failed to update type rating',
      });
    }
  });
