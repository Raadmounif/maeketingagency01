// Keep as CJS so you can run it with `node` easily on Windows.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcrypt");

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email) throw new Error("Missing ADMIN_EMAIL");
  if (!password) throw new Error("Missing ADMIN_PASSWORD");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be >= 8 chars");

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { role: "PLATFORM_ADMIN", passwordHash },
      });
      console.log(`Updated user -> PLATFORM_ADMIN: ${email}`);
    } else {
      await prisma.user.create({
        data: {
          email,
          name: null,
          passwordHash,
          role: "PLATFORM_ADMIN",
        },
      });
      console.log(`Created PLATFORM_ADMIN: ${email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});

