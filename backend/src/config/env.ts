// env helper: loads environment variables and exports typed keys
// Comments are written simply so a new developer can follow.

import dotenv from "dotenv";

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "changeme",
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || "",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION || "",
  // The deployed frontend's origin, for CORS. Defaults to the Vite dev
  // server's default port so local development works with no setup.
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
};
