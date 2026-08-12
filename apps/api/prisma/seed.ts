import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const requiredRoles = [
  RoleName.SUPER_ADMIN,
  RoleName.GYM_OWNER,
  RoleName.ADMIN,
  RoleName.STAFF,
  RoleName.MEMBER
];

interface SeedMembershipPlan {
  name: string;
  durationDays: number;
  priceCents: number;
  ptIncluded: boolean;
  lockerIncluded: boolean;
  guestPassesIncluded: number;
  accessTiming: string | null;
  gracePeriodDays: number;
  freezeAllowed: boolean;
}

interface SeedWorkoutTemplate {
  name: string;
  exercises: Array<{ name: string; sets: number; reps: number; notes?: string }>;
}

interface SeedDietTemplate {
  name: string;
  meals: Array<{ name: string; calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; notes?: string }>;
}

const defaultMembershipPlans: SeedMembershipPlan[] = [
  {
    name: "Monthly Plan",
    durationDays: 30,
    priceCents: 80_000,
    ptIncluded: false,
    lockerIncluded: false,
    guestPassesIncluded: 0,
    accessTiming: "All-day gym floor access",
    gracePeriodDays: 3,
    freezeAllowed: false
  },
  {
    name: "Monthly + Coach",
    durationDays: 30,
    priceCents: 90_000,
    ptIncluded: true,
    lockerIncluded: false,
    guestPassesIncluded: 0,
    accessTiming: "All-day access with coach add-on",
    gracePeriodDays: 3,
    freezeAllowed: false
  },
  {
    name: "6-Month Plan",
    durationDays: 180,
    priceCents: 456_000,
    ptIncluded: false,
    lockerIncluded: false,
    guestPassesIncluded: 2,
    accessTiming: "All-day gym floor access",
    gracePeriodDays: 7,
    freezeAllowed: true
  },
  {
    name: "1-Year Plan",
    durationDays: 365,
    priceCents: 844_800,
    ptIncluded: false,
    lockerIncluded: true,
    guestPassesIncluded: 6,
    accessTiming: "All-day gym floor access",
    gracePeriodDays: 10,
    freezeAllowed: true
  }
];

const defaultWorkoutTemplates: SeedWorkoutTemplate[] = [
  {
    name: "Chest Strength Builder",
    exercises: [
      { name: "Barbell bench press", sets: 4, reps: 8 },
      { name: "Incline dumbbell press", sets: 3, reps: 10 },
      { name: "Cable fly", sets: 3, reps: 12 },
      { name: "Push-up finisher", sets: 2, reps: 15 }
    ]
  },
  {
    name: "Back Width & Rows",
    exercises: [
      { name: "Lat pulldown", sets: 4, reps: 10 },
      { name: "Seated cable row", sets: 4, reps: 10 },
      { name: "Single-arm dumbbell row", sets: 3, reps: 12 },
      { name: "Face pull", sets: 3, reps: 15 }
    ]
  },
  {
    name: "Arms: Biceps & Triceps",
    exercises: [
      { name: "EZ-bar curl", sets: 3, reps: 12 },
      { name: "Hammer curl", sets: 3, reps: 12 },
      { name: "Rope triceps pushdown", sets: 3, reps: 12 },
      { name: "Overhead triceps extension", sets: 3, reps: 12 }
    ]
  },
  {
    name: "Abs & Forearms",
    exercises: [
      { name: "Hanging knee raise", sets: 3, reps: 15 },
      { name: "Cable crunch", sets: 3, reps: 15 },
      { name: "Wrist curl", sets: 3, reps: 18 },
      { name: "Farmer carry", sets: 4, reps: 40, notes: "Meters per carry" }
    ]
  }
];

const defaultDietTemplates: SeedDietTemplate[] = [
  {
    name: "Veg Lean Gain",
    meals: [
      { name: "Paneer oats bowl", calories: 520, proteinGrams: 32, carbsGrams: 58, fatGrams: 18 },
      { name: "Rajma rice with salad", calories: 650, proteinGrams: 28, carbsGrams: 92, fatGrams: 14 },
      { name: "Curd, fruit, and nuts", calories: 360, proteinGrams: 18, carbsGrams: 34, fatGrams: 16 }
    ]
  },
  {
    name: "Veg Fat Loss",
    meals: [
      { name: "Besan chilla with curd", calories: 420, proteinGrams: 28, carbsGrams: 42, fatGrams: 12 },
      { name: "Tofu stir fry", calories: 480, proteinGrams: 36, carbsGrams: 36, fatGrams: 18 },
      { name: "Dal soup and salad", calories: 340, proteinGrams: 22, carbsGrams: 46, fatGrams: 7 }
    ]
  },
  {
    name: "Non-Veg Lean Gain",
    meals: [
      { name: "Egg bhurji and toast", calories: 520, proteinGrams: 36, carbsGrams: 40, fatGrams: 22 },
      { name: "Chicken rice bowl", calories: 720, proteinGrams: 52, carbsGrams: 82, fatGrams: 16 },
      { name: "Greek yogurt shake", calories: 390, proteinGrams: 30, carbsGrams: 44, fatGrams: 9 }
    ]
  },
  {
    name: "Non-Veg Fat Loss",
    meals: [
      { name: "Boiled eggs and fruit", calories: 360, proteinGrams: 28, carbsGrams: 25, fatGrams: 16 },
      { name: "Grilled chicken salad", calories: 460, proteinGrams: 48, carbsGrams: 22, fatGrams: 18 },
      { name: "Fish curry with millet", calories: 520, proteinGrams: 42, carbsGrams: 48, fatGrams: 15 }
    ]
  }
];

async function main(): Promise<void> {
  for (const name of requiredRoles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const plan of defaultMembershipPlans) {
    const existing = await prisma.membershipPlan.findFirst({ where: { name: plan.name } });
    if (existing) {
      await prisma.membershipPlan.update({
        where: { id: existing.id },
        data: { ...plan, isActive: true }
      });
    } else {
      await prisma.membershipPlan.create({
        data: plan
      });
    }
  }

  for (const template of defaultWorkoutTemplates) {
    const existing = await prisma.workoutPlanTemplate.findFirst({ where: { name: template.name } });
    if (existing) {
      await prisma.workoutPlanTemplate.update({
        where: { id: existing.id },
        data: { exercises: template.exercises, isActive: true }
      });
    } else {
      await prisma.workoutPlanTemplate.create({ data: template });
    }
  }

  for (const template of defaultDietTemplates) {
    const existing = await prisma.dietPlanTemplate.findFirst({ where: { name: template.name } });
    if (existing) {
      await prisma.dietPlanTemplate.update({
        where: { id: existing.id },
        data: { meals: template.meals, isActive: true }
      });
    } else {
      await prisma.dietPlanTemplate.create({ data: template });
    }
  }

  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;

  if (!email || !password) {
    console.info("OWNER_EMAIL or OWNER_PASSWORD not provided; skipped owner seed.");
    return;
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.GYM_OWNER } });
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      passwordHash,
      firstName: process.env.OWNER_FIRST_NAME ?? "Gym",
      lastName: process.env.OWNER_LAST_NAME ?? "Owner",
      roleId: ownerRole.id,
      isActive: true
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: process.env.OWNER_FIRST_NAME ?? "Gym",
      lastName: process.env.OWNER_LAST_NAME ?? "Owner",
      roleId: ownerRole.id
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
