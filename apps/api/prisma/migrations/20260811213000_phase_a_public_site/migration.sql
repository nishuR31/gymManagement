CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'READ');

CREATE TABLE "Inquiry" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Inquiry_email_idx" ON "Inquiry"("email");
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");
