// Minimal ambient typing for multer, for the same reason as cookie-parser.d.ts: the real
// @types/multer pulls in a version of @types/express-serve-static-core that conflicts with
// this workspace's pinned Express 4 types (npm hoists it to the monorepo root and the two
// copies are structurally incompatible). Only the memory-storage upload path this app
// actually uses is declared.
declare module 'multer' {
  import { RequestHandler } from 'express';

  namespace multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }

    interface StorageEngine {}

    interface Options {
      storage?: StorageEngine;
      limits?: { fileSize?: number; files?: number };
    }

    interface Instance {
      single(fieldName: string): RequestHandler;
    }
  }

  function multer(options?: multer.Options): multer.Instance;

  namespace multer {
    function memoryStorage(): StorageEngine;
  }

  export = multer;
}
