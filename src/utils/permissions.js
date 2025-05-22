import { PERMISSIONS } from '../constants/permissions';

// Default permission sets for each builtin role.
export const ROLE_DEFAULT_PERMISSIONS = {
  admin: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INDIVIDUS,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.MASS_ATTRIBUTION,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_COLUMNS,
    PERMISSIONS.EDIT_ALL,
    PERMISSIONS.EDIT_READONLY_FIELDS,
  ],
  manager: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INDIVIDUS,
    PERMISSIONS.IMPORT_DATA,
    PERMISSIONS.MASS_ATTRIBUTION,
    PERMISSIONS.EDIT_ALL,
  ],
  user: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INDIVIDUS,
    PERMISSIONS.EDIT_ASSIGNED,
  ],
};

export function getPermissionsForRole(role) {
  return ROLE_DEFAULT_PERMISSIONS[role] || [];
}

export function hasPermission(user, perm) {
  if (!user) return false;
  const perms = Array.isArray(user.permissions)
    ? user.permissions
    : getPermissionsForRole(user.role);
  return perms.includes(perm);
}
