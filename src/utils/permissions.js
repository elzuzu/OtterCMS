export function hasPermission(user, perm) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(perm);
}
