import { AppError } from '../errors.js';

/**
 * Zod sxemasi bo'yicha so'rovni tekshiradi.
 * Tekshirilgan ma'lumot req.validated.{body,query,params} da bo'ladi.
 *
 * Express 5 da req.query faqat o'qish uchun, shuning uchun
 * natijani req.query ga yozmasdan, alohida req.validated da saqlaymiz.
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      const validated = {};

      if (schemas.body) {
        validated.body = schemas.body.parse(req.body ?? {});
      }
      if (schemas.query) {
        validated.query = schemas.query.parse(req.query ?? {});
      }
      if (schemas.params) {
        validated.params = schemas.params.parse(req.params ?? {});
      }

      req.validated = validated;
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return next(err);
      }
      next(new AppError(400, 'VALIDATION_ERROR', "So'rov noto'g'ri"));
    }
  };
}

export default validate;