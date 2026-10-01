// One-off account provisioning -- for roles (doctor, staff) that aren't
// meant to be self-serve through the public /register form, which always
// creates role "patient".
//
// Usage: node scripts/create-user.mjs <email> <password> <fullName> [role]
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [email, password, fullName, role = "patient"] = process.argv.slice(2);

if (!email || !password || !fullName) {
  console.error("Usage: node scripts/create-user.mjs <email> <password> <fullName> [role]");
  process.exit(1);
}

const prisma = new PrismaClient();

const passwordHash = await bcrypt.hash(password, 10);

const user = await prisma.user.upsert({
  where: { email },
  create: { email, passwordHash, fullName, role },
  update: { passwordHash, fullName, role },
});

console.log(`OK: ${user.email} (role=${user.role}, id=${user.id})`);
await prisma.$disconnect();
