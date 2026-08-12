// challan.controller.ts: translates HTTP requests into calls to
// challan.service, and turns the results back into HTTP responses.

import { Request, Response, NextFunction } from "express";
import * as challanService from "./challan.service";
import { streamChallanPdf } from "./challan.pdf";

export async function listChallansHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await challanService.listChallans(req.validatedQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChallanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.getChallanById(req.params.id);
    res.status(200).json(challan);
  } catch (err) {
    next(err);
  }
}

export async function createChallanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId, items } = req.body;
    // createdBy always comes from the logged-in user's token.
    const challan = await challanService.createChallan(customerId, items, req.user!.id);
    res.status(201).json(challan);
  } catch (err) {
    next(err);
  }
}

export async function updateChallanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.updateChallan(req.params.id, req.body);
    res.status(200).json(challan);
  } catch (err) {
    next(err);
  }
}

export async function confirmChallanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.confirmChallan(req.params.id, req.user!.id);
    res.status(200).json(challan);
  } catch (err) {
    next(err);
  }
}

export async function cancelChallanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.cancelChallan(req.params.id, req.user!.id);
    res.status(200).json(challan);
  } catch (err) {
    next(err);
  }
}

export async function downloadChallanPdfHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await streamChallanPdf(req.params.id, res);
  } catch (err) {
    next(err);
  }
}
