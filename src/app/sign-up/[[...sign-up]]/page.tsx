import { SignUp } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import { e2eAuthEnabled } from "@/lib/server/env";
import { AuthFrame } from "@/components/shell/AuthFrame";
export const metadata = { title: "Join" };
export default function Page() {
  if (e2eAuthEnabled()) notFound();
  return <AuthFrame><SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/home" /></AuthFrame>;
}
