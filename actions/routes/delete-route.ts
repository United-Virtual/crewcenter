'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { findRouteIdsByFilters } from '@/db/queries';
import { deleteRoute, deleteRoutesByIds } from '@/domains/routes/delete-route';
import { handleDbError } from '@/lib/db-error';
import { createRoleActionClient } from '@/lib/safe-action';

const deleteSchema = z.object({ id: z.string() });

const deleteBulkSchema = z.object({ ids: z.array(z.string()).min(1) });

const filterConditionSchema = z
  .object({
    id: z.string(),
    field: z.enum([
      'flightNumber',
      'departureIcao',
      'arrivalIcao',
      'aircraftId',
      'flightTime',
      'airline',
    ]),
    operator: z.enum([
      'contains',
      'is',
      'is_not',
      'starts_with',
      'ends_with',
      'greater_than',
      'less_than',
      'greater_equal',
      'less_equal',
    ]),
    value: z.union([z.string(), z.number()]).optional(),
  })
  .refine(
    (f) =>
      f.field === 'airline' ? ['is', 'is_not'].includes(f.operator) : true,
    {
      path: ['operator'],
      message: 'Only is/is_not allowed for airline',
    }
  );

const deleteByFilterSchema = z.object({
  filters: z.array(filterConditionSchema),
});

export const deleteRouteAction = createRoleActionClient(['routes'])
  .inputSchema(deleteSchema)
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    try {
      await deleteRoute(id);

      revalidatePath('/admin/routes');

      return { success: true, message: 'Route deleted' } as const;
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete route',
        constraint:
          'Cannot delete route - it is being used in existing records',
        reference:
          'Cannot delete route - it has associated data that must be removed first',
      });
    }
  });

export const deleteBulkRoutesAction = createRoleActionClient(['routes'])
  .inputSchema(deleteBulkSchema)
  .action(async ({ parsedInput }) => {
    const { ids } = parsedInput;

    try {
      const { deleted } = await deleteRoutesByIds(ids);

      revalidatePath('/admin/routes');

      return {
        success: true,
        message: `${deleted} route${deleted === 1 ? '' : 's'} deleted`,
      } as const;
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete routes',
        constraint:
          'Cannot delete routes - one or more are being used in existing records',
        reference:
          'Cannot delete routes - they have associated data that must be removed first',
      });
    }
  });

export const deleteFilteredRoutesAction = createRoleActionClient(['routes'])
  .inputSchema(deleteByFilterSchema)
  .action(async ({ parsedInput }) => {
    const { filters } = parsedInput;

    try {
      const ids = await findRouteIdsByFilters(filters);

      if (ids.length === 0) {
        return {
          success: true,
          message: 'No routes matched filters',
          deleted: 0,
        } as const;
      }

      const { deleted } = await deleteRoutesByIds(ids);

      revalidatePath('/admin/routes');

      return {
        success: true,
        message: `Deleted ${deleted} route${deleted === 1 ? '' : 's'}`,
        deleted,
      } as const;
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to delete filtered routes',
        constraint:
          'Cannot delete routes - one or more are being used in existing records',
        reference:
          'Cannot delete routes - they have associated data that must be removed first',
      });
    }
  });
