// customer.controller.ts: translates HTTP requests into calls to
// customer.service, and turns the results back into HTTP responses.

import { Request, Response, NextFunction } from "express";
import * as customerService from "./customer.service";

export async function listCustomersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.listCustomers(req.validatedQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.status(200).json(customer);
  } catch (err) {
    next(err);
  }
}

export async function createCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.status(200).json(customer);
  } catch (err) {
    next(err);
  }
}

export async function addNoteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // createdBy always comes from the logged-in user's token, never
    // from the request body -- a client can't claim to be someone else.
    const note = await customerService.addNote(req.params.id, req.body.note, req.user!.id);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}
