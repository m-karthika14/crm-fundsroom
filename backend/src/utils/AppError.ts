// AppError: a small custom error we throw on purpose whenever a
// request breaks a business rule (wrong password, duplicate email,
// insufficient stock, etc). Unlike a normal Error, it carries the
// exact HTTP status code + optional details that errorHandler.ts
// needs to build the response -- so a service function can just
// `throw new AppError(404, "Customer not found")` and the right
// JSON response happens automatically.

export class AppError extends Error {
  status: number;
  details: unknown[];

  constructor(status: number, message: string, details: unknown[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
