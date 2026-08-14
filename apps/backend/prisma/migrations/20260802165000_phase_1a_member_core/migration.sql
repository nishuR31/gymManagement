-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateSequence
CREATE SEQUENCE "MemberCodeSeq" START 1 INCREMENT 1 MINVALUE 1 CACHE 1;

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL DEFAULT 'GYM-' || lpad(nextval('"MemberCodeSeq"'::regclass)::text, 6, '0'),
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "medicalNotes" TEXT,
    "heightCm" DECIMAL(5,2),
    "weightKg" DECIMAL(5,2),
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "qrSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberMeasurement" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "heightCm" DECIMAL(5,2) NOT NULL,
    "weightKg" DECIMAL(5,2) NOT NULL,
    "bodyFatPercent" DECIMAL(5,2),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProgressPhoto" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberCode_key" ON "Member"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_qrSecret_key" ON "Member"("qrSecret");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE INDEX "Member_phone_idx" ON "Member"("phone");

-- CreateIndex
CREATE INDEX "Member_email_idx" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_memberCode_idx" ON "Member"("memberCode");

-- CreateIndex
CREATE INDEX "MemberMeasurement_memberId_recordedAt_idx" ON "MemberMeasurement"("memberId", "recordedAt");

-- CreateIndex
CREATE INDEX "MemberProgressPhoto_memberId_takenAt_idx" ON "MemberProgressPhoto"("memberId", "takenAt");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberMeasurement" ADD CONSTRAINT "MemberMeasurement_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberProgressPhoto" ADD CONSTRAINT "MemberProgressPhoto_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
