"use client";
import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
export function SignOut({ testMode }: { testMode: boolean }) {
  const inner = <><LogOut size={16} aria-hidden="true" />Sign out</>;
  if (testMode) return <a href="/e2e/sign-in?u=out" className={buttonClass("secondary")}>{inner}</a>;
  return <SignOutButton redirectUrl="/"><button type="button" className={buttonClass("secondary")}>{inner}</button></SignOutButton>;
}
