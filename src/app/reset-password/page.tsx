import { redirect } from "next/navigation";
import { identity } from "@/lib/server/identity";
import { Wordmark } from "@/components/shell/Nav";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";

export const metadata = { title: "New password" };

// Reached from a reset email (the link signs the person in first). Signed out here means the link didn't work.
export default async function ResetPassword() {
  if (!(await identity())) redirect("/sign-in?error=link");
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="display mt-10 text-[40px]">New password</h1>
      <p className="mt-3 text-text-2">Choose a new password for your Baseline account.</p>
      <div className="mt-8"><NewPasswordForm /></div>
    </main>
  );
}
