-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "type",
ADD COLUMN     "type" "StockMovementType" NOT NULL;

