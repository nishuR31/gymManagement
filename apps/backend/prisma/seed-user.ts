import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "nishanrajak01@gmail.com";
  const password = "nishanr31@";

  const memberRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.MEMBER } });
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      passwordHash,
      firstName: "Nishan",
      lastName: "Rajak",
      roleId: memberRole.id,
      isActive: true,
      mustChangePassword: false,
      twoFactorEnabled: false
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: "Nishan",
      lastName: "Rajak",
      roleId: memberRole.id,
      isActive: true,
      mustChangePassword: false,
      twoFactorEnabled: false
    }
  });

  console.log("Seeded user:", email);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
