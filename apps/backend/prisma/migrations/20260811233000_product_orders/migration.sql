CREATE TYPE "ProductOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED');

CREATE TYPE "ProductOrderPaymentStatus" AS ENUM ('PENDING', 'PAID');

ALTER TABLE "Product"
ADD COLUMN "description" TEXT,
ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "ProductOrder" (
    "id" TEXT NOT NULL,
    "orderCode" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentStatus" "ProductOrderPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "ProductOrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductOrder_orderCode_key" ON "ProductOrder"("orderCode");
CREATE INDEX "ProductOrder_memberId_idx" ON "ProductOrder"("memberId");
CREATE INDEX "ProductOrder_productId_idx" ON "ProductOrder"("productId");
CREATE INDEX "ProductOrder_paymentStatus_idx" ON "ProductOrder"("paymentStatus");
CREATE INDEX "ProductOrder_status_idx" ON "ProductOrder"("status");
CREATE INDEX "ProductOrder_createdAt_idx" ON "ProductOrder"("createdAt");

ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
