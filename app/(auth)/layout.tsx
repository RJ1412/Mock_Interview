import type { ReactNode } from "react";
// isUserAuthenticated
// import { isUserAuthenticated } from "@/lib/actions/auth.actions";
import { redirect } from "next/navigation";
import { isUserAuthenticated } from "@/lib/actions/auth.action";


async function AuthLayout({ children }: { children: ReactNode }) {
  const isAuthenticated = await isUserAuthenticated();

  if (isAuthenticated) redirect("/");

  return <main className="auth-layout">{children}</main>;
}

export default AuthLayout;