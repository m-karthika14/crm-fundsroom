// seed.ts creates one test user per role, so you always have 4
// working logins to hand over -- even on a totally fresh database.
//
// Run it with: npm run seed
// (also runs automatically after `npx prisma migrate reset`, because
// of the "prisma.seed" entry in package.json)

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Every seed user shares this password, purely to make testing easy.
// This is a TEST credential only -- see backend/README.md.
const TEST_PASSWORD = "Password123!";

const SEED_USERS: { name: string; email: string; role: Role }[] = [
  { name: "Admin User", email: "admin@fundsroom.test", role: Role.ADMIN },
  { name: "Sales User", email: "sales@fundsroom.test", role: Role.SALES },
  { name: "Warehouse User", email: "warehouse@fundsroom.test", role: Role.WAREHOUSE },
  { name: "Accounts User", email: "accounts@fundsroom.test", role: Role.ACCOUNTS },
];

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const seedUser of SEED_USERS) {
    // upsert = "create it if it's missing, otherwise leave it alone".
    // This makes the script safe to re-run any number of times without
    // creating duplicate users or erroring on a unique-email conflict.
    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: { ...seedUser, passwordHash },
    });
    console.log(`Seeded user: ${seedUser.email} (role: ${seedUser.role})`);
  }
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
