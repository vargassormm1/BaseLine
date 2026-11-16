import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { e2eAuthEnabled } from "@/lib/server/env";
import { AuthFrame } from "@/components/shell/AuthFrame";
export const metadata = { title: "Sign in" };
export default function Page() {
  if (e2eAuthEnabled()) notFound();
  return <AuthFrame><SignIn path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/home" /></AuthFrame>;
}
