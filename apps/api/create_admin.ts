import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "nishanrajak01@gmail.com";
  const password = "nishur31@"; // Default password

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      roleId: superAdminRole.id,
      isActive: true,
      firstName: "Nishan",
      lastName: "Rajak"
    },
    create: {
      email,
      passwordHash,
      firstName: "Nishan",
      lastName: "Rajak",
      roleId: superAdminRole.id
    }
  });

  console.log(`Created/Updated superadmin user: ${user.email} with password: ${password}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
