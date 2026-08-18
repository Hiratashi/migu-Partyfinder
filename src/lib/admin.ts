import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export async function requireAdmin() {
  const user=await currentUser();
  if(!user) redirect("/login");
  if(!user.is_admin) redirect("/");
  return user;
}

export async function currentAdmin() {
  const user=await currentUser();
  return user?.is_admin ? user : null;
}
