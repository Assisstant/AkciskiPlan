import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getOptionalUser();
  redirect(user ? "/students" : "/auth/signin");
}
