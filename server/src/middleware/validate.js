import { ZodError } from 'zod';

/**
 * Validates request body, query, and/or params against Zod schemas.
 * Usage:
 *   validate({ body: schema, query: schema, params: schema })
 *   or validate(bodySchema)
 */
export function validate(schemas) {
  return async (req, res, next) => {
    try {
      if (schemas.safeParse) {
        // Direct Zod schema passed: validate body
        req.body = await schemas.parseAsync(req.body);
        return next();
      }

      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }

      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }

      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error);
      }
      return next(error);
    }
  };
}

export default validate;
