// Simple Express server entrypoint
// Easy comments: this file starts the server and wires basic middleware.

import express from "express";
import { json } from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import productRoutes from "./modules/products/product.routes";
import challanRoutes from "./modules/challans/challan.routes";

const app = express();

// Parse JSON bodies (this is needed to read request bodies)
app.use(json());

// Healthcheck route
app.get("/", (req, res) => {
  res.json({ message: "Fundsroom CRM API is running" });
});

// Each module gets its own mount point. As we build customers,
// products, and challans, they'll each get a line like this one.
app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/products", productRoutes);
app.use("/challans", challanRoutes);

// Plug the central error handler last, so it can catch errors thrown
// by any route registered above it.
app.use(errorHandler);

const port = env.PORT || 4000;
app.listen(port, () => {
  // Friendly console message so a developer knows server started
  console.log(`Server listening on http://localhost:${port}`);
});
