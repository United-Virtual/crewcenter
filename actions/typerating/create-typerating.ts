'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createTypeRating } from '@/domains/typerating/create-typerating';
import { extractDbErrorMessage } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const createTypeRatingSchema = z.object({
  name: z
    .string()
    .min(1, 'Type rating name is required')
    .max(15, 'Type rating name must be 15 characters or less'),
  aircraftIds: z.array(z.string()).min(1, 'Select at least one aircraft'),
});

export const createTypeRatingAction = createRoleActionClient(['admin'])
  .inputSchema(createTypeRatingSchema)
  .action(async ({ parsedInput: { name, aircraftIds } }) => {
    try {
      const newTypeRating = await createTypeRating({
        name: name.trim(),
        aircraftIds,
      });

      revalidatePath('/admin/typeratings');

      return {
        success: true,
        message: 'Type rating created successfully',
        typeRating: newTypeRating,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        unique: {
          name: 'A type rating with this name already exists',
        },
        fallback: 'Failed to create type rating',
      });

      return {
        success: false,
        error: errorMessage,
        message: errorMessage,
      };
    }
  });
