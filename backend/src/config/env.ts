// env helper: loads environment variables and exports typed keys
// Comments are written simply so a new developer can follow.

import dotenv from "dotenv";

dotenv.config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "changeme",
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || "",
};
