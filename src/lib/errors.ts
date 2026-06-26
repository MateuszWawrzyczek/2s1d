import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends HTTPException {
  constructor(status: ContentfulStatusCode, detail: string) {
    super(status, { message: detail });
  }
}

export function notFound(detail: string): never {
  throw new AppError(404, detail);
}

export function badRequest(detail: string): never {
  throw new AppError(400, detail);
}

export function forbidden(detail: string): never {
  throw new AppError(403, detail);
}

export function unauthorized(detail: string = 'Unauthorized'): never {
  throw new AppError(401, detail);
}

export function serviceUnavailable(detail: string): never {
  throw new AppError(503, detail);
}

export function tooManyRequests(detail: string): never {
  throw new AppError(429, detail);
}
