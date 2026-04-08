import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

export async function bootstrapAdminFromEnv() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
  const displayName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Администратор";

  if (!username || !password) {
    console.log("Bootstrap admin skipped: missing BOOTSTRAP_ADMIN_USERNAME or BOOTSTRAP_ADMIN_PASSWORD.");
    return;
  }

  const existing = await prisma.user.findUnique({
    where: {
      username
    }
  });

  if (existing) {
    console.log(`Bootstrap admin skipped: user "${username}" already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash,
      role: "admin",
      active: true
    }
  });

  console.log(`Bootstrap admin created: ${username}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrapAdminFromEnv()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
