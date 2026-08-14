-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('PROTEIN', 'CREATINE', 'ACCESSORY', 'MERCHANDISE', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StaffProfileRole" AS ENUM ('ADMIN', 'STAFF', 'TRAINER');

-- CreateEnum
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "sku" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "costCents" INTEGER NOT NULL,
    "reorderThreshold" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "unitCostCents" INTEGER,
    "unitPriceCents" INTEGER,
    "reference" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StaffProfileRole" NOT NULL,
    "salaryCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "status" "StaffAttendanceStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutPlanTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "exercises" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberWorkoutPlan" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "exercises" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberWorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlanTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meals" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietPlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberDietPlan" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "meals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberDietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX "StockMovement_recordedBy_idx" ON "StockMovement"("recordedBy");
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");
CREATE INDEX "StaffProfile_role_idx" ON "StaffProfile"("role");
CREATE INDEX "StaffProfile_isActive_idx" ON "StaffProfile"("isActive");
CREATE INDEX "StaffAttendance_staffProfileId_checkInAt_idx" ON "StaffAttendance"("staffProfileId", "checkInAt");
CREATE INDEX "StaffAttendance_status_idx" ON "StaffAttendance"("status");
CREATE UNIQUE INDEX staff_one_open_attendance_per_profile
ON "StaffAttendance" ("staffProfileId")
WHERE "status" = 'OPEN';
CREATE INDEX "LeaveRequest_staffProfileId_idx" ON "LeaveRequest"("staffProfileId");
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");
CREATE INDEX "WorkoutPlanTemplate_isActive_idx" ON "WorkoutPlanTemplate"("isActive");
CREATE INDEX "MemberWorkoutPlan_memberId_startDate_idx" ON "MemberWorkoutPlan"("memberId", "startDate");
CREATE INDEX "MemberWorkoutPlan_trainerId_idx" ON "MemberWorkoutPlan"("trainerId");
CREATE INDEX "DietPlanTemplate_isActive_idx" ON "DietPlanTemplate"("isActive");
CREATE INDEX "MemberDietPlan_memberId_startDate_idx" ON "MemberDietPlan"("memberId", "startDate");
CREATE INDEX "MemberDietPlan_trainerId_idx" ON "MemberDietPlan"("trainerId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemberWorkoutPlan" ADD CONSTRAINT "MemberWorkoutPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberWorkoutPlan" ADD CONSTRAINT "MemberWorkoutPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutPlanTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberWorkoutPlan" ADD CONSTRAINT "MemberWorkoutPlan_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberDietPlan" ADD CONSTRAINT "MemberDietPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberDietPlan" ADD CONSTRAINT "MemberDietPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DietPlanTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberDietPlan" ADD CONSTRAINT "MemberDietPlan_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
