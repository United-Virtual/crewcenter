'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { removeRole } from '@/domains/users/remove-role';
import { handleDbError } from '@/lib/db-error';
import { ADMIN_ROLE, OWNER_ROLE } from '@/lib/roles';
import { createRoleActionClient } from '@/lib/safe-action';

const removeRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.string().min(1, 'Role is required'),
});

export const removeRoleAction = createRoleActionClient(['admin'])
  .inputSchema(removeRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { userId, role } = parsedInput;

    // Protect sensitive roles
    if (role === OWNER_ROLE) {
      throw new Error('Cannot remove owner role');
    }
    if (role === ADMIN_ROLE) {
      const callerIsOwner = Array.isArray(ctx.userRoles)
        ? ctx.userRoles.includes(OWNER_ROLE)
        : false;
      if (!callerIsOwner) {
        throw new Error('Only the owner can remove the admin role');
      }
    }

    try {
      const result = await removeRole({ userId, role });

      revalidatePath('/admin/users');
      revalidatePath(`/admin/users/${userId}`);

      return { success: true, message: result.message, roles: result.roles };
    } catch (error) {
      handleDbError(error, {
        fallback: 'Failed to remove role',
      });
    }
  });
