import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/errors";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError("Not signed in.");
  return session;
}

export async function requirePageSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}
