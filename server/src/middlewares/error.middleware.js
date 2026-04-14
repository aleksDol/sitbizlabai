import { ERROR_CODES, ERROR_MESSAGES } from "../config/error.constants.js";
import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, ERROR_CODES.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND));
}

export function errorHandler(error, _req, res, _next) {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: ERROR_MESSAGES.INVALID_BODY
      }
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  console.error(error);
  return res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR
    }
  });
}
