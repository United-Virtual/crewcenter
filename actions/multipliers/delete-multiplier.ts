'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { deleteMultiplier } from '@/domains/multipliers/delete-multiplier';
import { extractDbErrorMessage } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const deleteMultiplierSchema = z.object({
  id: z.string().min(1, 'Multiplier ID is required'),
});

const deleteBulkMultipliersSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const deleteMultiplierAction = createRoleActionClient(['multipliers'])
  .inputSchema(deleteMultiplierSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const deletedMultiplier = await deleteMultiplier(id);

      revalidatePath('/admin/multipliers');

      return {
        success: true,
        message: 'Multiplier deleted successfully',
        deletedMultiplier,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        fallback: 'Failed to delete multiplier',
        constraint:
          'Cannot delete multiplier - it is being used in existing records',
        reference:
          'Cannot delete multiplier - it has associated data that must be removed first',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  });

export const deleteBulkMultipliersAction = createRoleActionClient([
  'multipliers',
])
  .inputSchema(deleteBulkMultipliersSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      await Promise.all(ids.map((id) => deleteMultiplier(id)));

      revalidatePath('/admin/multipliers');

      return {
        success: true,
        message: `${ids.length} multiplier${ids.length === 1 ? '' : 's'} deleted successfully`,
      };
    } catch (error) {
      const errorMessage = extractDbErrorMessage(error, {
        fallback: 'Failed to delete multipliers',
        constraint:
          'Cannot delete multipliers - they are being used in existing records',
        reference:
          'Cannot delete multipliers - they have associated data that must be removed first',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  });
