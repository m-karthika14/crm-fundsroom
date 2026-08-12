-- CreateEnum
CREATE TYPE "ChallanStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Challan" DROP COLUMN "status",
ADD COLUMN     "status" "ChallanStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "ChallanCounter" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChallanCounter_pkey" PRIMARY KEY ("year")
);

-- AddForeignKey
ALTER TABLE "ChallanItem" ADD CONSTRAINT "ChallanItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

