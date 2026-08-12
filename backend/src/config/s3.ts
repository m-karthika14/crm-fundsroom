// s3.ts: one shared S3 client the app uses to generate pre-signed
// upload URLs for product images (see Part E.1 of the plan). We never
// route the actual image bytes through our server -- the frontend
// uploads directly to S3 using the signed URL this client produces.

import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// The bucket is configured with a public-read bucket policy scoped to
// this "products/" prefix (see backend/README.md), so once an upload
// finishes, this plain URL works with no signing and no auth --
// exactly what an <img> tag needs.
export function publicUrlFor(key: string): string {
  return `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
