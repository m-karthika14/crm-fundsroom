// product.controller.ts: translates HTTP requests into calls to
// product.service, and turns the results back into HTTP responses.

import { Request, Response, NextFunction } from "express";
import * as productService from "./product.service";

export async function listProductsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.listProducts(req.validatedQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

export async function createStockMovementHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { quantityChanged, type, reason } = req.body;
    // createdBy always comes from the logged-in user's token, never
    // from the request body.
    const result = await productService.createStockMovement(
      req.params.id,
      quantityChanged,
      type,
      reason,
      req.user!.id
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStockHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.validatedQuery;
    const result = await productService.getStockHistory(req.params.id, page, limit);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function imageUploadUrlHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileName, fileType } = req.body;
    const result = await productService.generateImageUploadUrl(req.params.id, fileName, fileType);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
