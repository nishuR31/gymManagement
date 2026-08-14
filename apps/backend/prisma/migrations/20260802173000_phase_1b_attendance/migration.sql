-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'MEMBER_ID', 'USERNAME_SEARCH');

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "checkInMethod" "CheckInMethod" NOT NULL,
    "checkedInBy" TEXT,
    "durationMinutes" INTEGER,
    "autoClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attendance_memberId_checkInAt_idx" ON "Attendance"("memberId", "checkInAt");

-- CreateIndex
CREATE INDEX "Attendance_checkInAt_idx" ON "Attendance"("checkInAt");

-- CreateIndex
CREATE INDEX "Attendance_checkOutAt_idx" ON "Attendance"("checkOutAt");

-- CreateIndex
CREATE INDEX "Attendance_checkedInBy_idx" ON "Attendance"("checkedInBy");

-- CreateIndex
CREATE UNIQUE INDEX attendance_one_open_session_per_member
ON "Attendance" ("memberId")
WHERE "checkOutAt" IS NULL;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
