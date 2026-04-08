import { bootstrapAdminFromEnv } from "../scripts/bootstrap-admin";

async function main() {
  await bootstrapAdminFromEnv();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
