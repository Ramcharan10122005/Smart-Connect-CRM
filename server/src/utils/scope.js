/**
 * Multi-role Data Scoping Filter for Prisma Queries
 * - REP: Scoped strictly to records they own or are assigned to.
 * - MANAGER & ADMIN: Full organization-wide visibility.
 *
 * @param {Object} user - The authenticated user object (from req.user)
 * @param {string} [ownerField='ownerId'] - The model property representing ownership (e.g. 'ownerId', 'assigneeId', 'createdById')
 * @returns {Object} Prisma where clause fragment
 */
export function scopeByOwner(user, ownerField = 'ownerId') {
  if (!user) {
    return { [ownerField]: '__UNAUTHORIZED__' };
  }

  // Managers and Admins have organization-wide visibility across team records
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return {};
  }

  // Sales Reps are strictly scoped to their assigned/owned records
  return {
    [ownerField]: user.id,
  };
}

export default scopeByOwner;
