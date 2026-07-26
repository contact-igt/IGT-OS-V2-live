// Canonical post-login landing page for a user — used both by POST /api/login (right
// after auth) and GET /api/users/me (so a page refresh mid-session redirects the same way
// a fresh login would, without duplicating this branching logic in two places).
export function getDestination(user: { role: string; department?: string | null; email: string; must_change_password?: boolean }): string {
  if (user.must_change_password) return '/set-password';

  if (user.role === 'admin' || user.role === 'super_admin') return '/dashboard';

  if (user.role === 'ops') {
    if (user.department?.toLowerCase() === 'finance') return '/dashboard/finance';
    if (user.email === 'contact@invictusglobaltech.com') return '/dashboard/coo';
    return '/dashboard/ops';
  }

  return '/my-workspace';
}
