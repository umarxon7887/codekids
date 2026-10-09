import { logger } from './logger.js';

export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Yo'l topilmadi: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Ichki server xatosi';
  let details;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = "Kiritilgan ma'lumot noto'g'ri";
    details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = "JSON formati noto'g'ri";
  } else if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = "So'rov hajmi juda katta";
  } else if (err.code === '23505') {
    status = 409;
    code = 'CONFLICT';
    message = "Bunday ma'lumot allaqachon mavjud";
  }

  if (status >= 500) {
    logger.error({ err, method: req.method, path: req.originalUrl }, 'Server xatosi');
  } else {
    logger.warn({ code, method: req.method, path: req.originalUrl }, message);
  }

  const body = { error: { code, message } };
  if (details) body.error.details = details;

  res.status(status).json(body);
}