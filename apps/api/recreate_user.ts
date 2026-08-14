import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "nishanrajak01@gmail.com";
  const password = "nishur31@";

  console.log(`Looking for user ${email}...`);
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { staffProfile: true }
  });

  if (user) {
    if (user.staffProfile) {
      await prisma.staffProfile.delete({ where: { id: user.staffProfile.id } });
      console.log(`Deleted staff profile for ${email}`);
    }
    await prisma.user.delete({
      where: { email: email.toLowerCase() }
    });
    console.log(`Deleted existing user ${email}`);
  }

  const role = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.SUPER_ADMIN } });
  const passwordHash = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: "Nishan",
      lastName: "Rajak",
      roleId: role.id,
      isActive: true,
      twoFactorEnabled: false
    }
  });

  await prisma.staffProfile.create({
    data: {
      userId: newUser.id,
      role: "ADMIN", // Valid StaffProfileRole
      salaryCents: 0,
      isActive: true
    }
  });

  console.log(`Created new SUPER_ADMIN user ${email} with password ${password} and 2FA disabled.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
