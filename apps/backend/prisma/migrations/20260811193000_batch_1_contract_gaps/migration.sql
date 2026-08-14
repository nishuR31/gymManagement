ALTER TABLE "StockMovement" ADD COLUMN "supplierId" TEXT;

ALTER TABLE "StockMovement"
  ADD CONSTRAINT "StockMovement_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StockMovement_supplierId_idx" ON "StockMovement"("supplierId");
