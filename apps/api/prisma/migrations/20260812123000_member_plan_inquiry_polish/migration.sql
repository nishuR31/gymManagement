ALTER TABLE "Inquiry" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Inquiry_phone_idx" ON "Inquiry"("phone");

ALTER TABLE "MemberWorkoutPlan" DROP CONSTRAINT IF EXISTS "MemberWorkoutPlan_trainerId_fkey";
ALTER TABLE "MemberWorkoutPlan" ALTER COLUMN "trainerId" DROP NOT NULL;
ALTER TABLE "MemberWorkoutPlan"
  ADD CONSTRAINT "MemberWorkoutPlan_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MemberDietPlan" DROP CONSTRAINT IF EXISTS "MemberDietPlan_trainerId_fkey";
ALTER TABLE "MemberDietPlan" ALTER COLUMN "trainerId" DROP NOT NULL;
ALTER TABLE "MemberDietPlan"
  ADD CONSTRAINT "MemberDietPlan_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
