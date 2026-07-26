// Minimal ambient typing for cookie-parser. @types/cookie-parser pulls in a version of
// @types/express-serve-static-core that conflicts with this workspace's pinned Express 4
// types (npm hoists it to the monorepo root and the two copies are structurally
// incompatible), so we declare just enough of the module's shape here instead.
declare module 'cookie-parser' {
  import { RequestHandler } from 'express';

  function cookieParser(secret?: string | string[], options?: any): RequestHandler;

  export = cookieParser;
}
