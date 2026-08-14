import { FastifyReply } from "fastify";

export function sendSuccess(
    res: FastifyReply,
    message: string,
    statusCode: number,
    data?: Record<string, any> | string | number | boolean | null,
    details?: Record<string, any>,
) {
    if (res.sent) return res;
    return res.code(statusCode).send({
        success: true,
        message,
        payload: data,
        ...(details && { details }),
    });
}

export function sendError(
    res: FastifyReply,
    message: string = "Error occured",
    statusCode: number = 400,
    errors?: any,
) {
    if (res.sent) return res;
    return res.code(statusCode).send({ success: false, message, ...(errors && { errors }) });
}

export function notFoundError(
    res: FastifyReply,
    message: string = "Resource not found",
    statusCode: number = 404,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function conflictError(
    res: FastifyReply,
    message: string = "Resource already exists",
    statusCode: number = 409,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function badRequestError(
    res: FastifyReply,
    message: string = "Invalid request",
    statusCode: number = 400,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function unauthorizedError(
    res: FastifyReply,
    message: string = "Unauthorized access",
    statusCode: number = 401,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function forbiddenError(
    res: FastifyReply,
    message: string = "Forbidden",
    statusCode: number = 403,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function paymentRequiredError(
    res: FastifyReply,
    message: string = "Payment required",
    statusCode: number = 402,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function redirectionError(
    res: FastifyReply,
    message: string = "Redirecting to login page",
    statusCode: number = 302,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function rateLimitError(
    res: FastifyReply,
    message: string = "Rate limit exceeded",
    statusCode: number = 429,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function internalServerError(
    res: FastifyReply,
    message: string = "Internal server error",
    statusCode: number = 500,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function methodNotAllowedError(
    res: FastifyReply,
    message: string = "Method not allowed",
    statusCode: number = 405,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}

export function validationError(
    res: FastifyReply,
    message: string = "Validation error",
    statusCode: number = 400,
    details?: Record<string, any>,
) {
    return sendError(res, message, statusCode, details);
}
