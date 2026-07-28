import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * Catches everything so unexpected (non-HttpException) errors never leak internals
 * (stack traces, DB error text, file paths) to the client — only Nest's own
 * HttpExceptions carry their intended message through as-is.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionsHandler");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException ? exception.getResponse() : "Internal server error";

    if (!isHttpException) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.stack : String(exception)
        }`,
      );
    } else if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status}: ${JSON.stringify(message)}`);
    }

    const body = !isHttpException
      ? { statusCode: status, message: "Internal server error" }
      : typeof message === "string"
        ? { statusCode: status, message }
        : { statusCode: status, ...(message as Record<string, unknown>) };

    response.status(status).json(body);
  }
}
