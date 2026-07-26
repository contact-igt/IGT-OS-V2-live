import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { ACCESS_COOKIE, verifyAccessToken } from '../lib/tokens';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Cookie is the primary transport now; the Authorization header fallback stays only for
// non-browser callers (scripts/tools hitting the API directly) that can't hold cookies.
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[ACCESS_COOKIE] || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Invalid token', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(403).json({ error: 'Forbidden' });
    // super_admin is a strict superset of admin — any route open to 'admin' is open to
    // super_admin too, without needing every call site updated to list both roles.
    const allowed = roles.includes(req.user.role) || (req.user.role === 'super_admin' && roles.includes('admin'));
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
};

// Gates a route behind a specific frontend page: roles in defaultRoles already have
// access to that page by default (matches the client-side guard in (app)/layout.tsx),
// everyone else needs an explicit admin-granted row in public.page_access.
export const requirePageAccess = (pagePath: string, defaultRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (defaultRoles.includes(req.user.role)) return next();
    if (req.user.role === 'super_admin' && defaultRoles.includes('admin')) return next();

    const pool: Pool = req.app.locals.pool;
    if (!pool) return res.status(500).json({ error: 'Database not configured' });

    try {
      const result = await pool.query(
        'SELECT 1 FROM public.page_access WHERE user_id = $1 AND page_path = $2',
        [req.user.id, pagePath]
      );
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'You do not have access to this page' });
      }
      next();
    } catch (error) {
      console.error('Error checking page access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
