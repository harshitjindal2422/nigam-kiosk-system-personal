import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => (req, res, next) => {
  try {
    // Validate request body, query, and params against the provided Zod schema
    const dataToValidate = {};
    if (schema.body || schema.shape?.body) dataToValidate.body = req.body;
    if (schema.query || schema.shape?.query) dataToValidate.query = req.query;
    if (schema.params || schema.shape?.params) dataToValidate.params = req.params;

    const validated = schema.safeParse(dataToValidate);

    if (!validated.success) {
      // Formulate a clean list of errors
      const formattedErrors = validated.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      throw new ApiError(400, 'Invalid request data provided', formattedErrors);
    }

    // Replace request parameters with validated/parsed results
    if (validated.data.body) req.body = validated.data.body;
    if (validated.data.query) req.query = validated.data.query;
    if (validated.data.params) req.params = validated.data.params;

    next();
  } catch (err) {
    next(err);
  }
};
