// auth.controller.ts: translates HTTP requests into calls to
// auth.service, and turns the results back into HTTP responses.
// No business logic lives here on purpose -- just request in,
// response out.

import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    // Hand off to the central error handler in middleware/errorHandler.ts
    next(err);
  }
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, role } = req.body;
    const user = await authService.register(name, email, password, role);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}
