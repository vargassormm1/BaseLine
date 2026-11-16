import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions";
import { buttonClass } from "@/components/ui/Button";
/** Sign out (a POST to our own server action, so it can't be triggered by a link or prefetch). */
export function SignOut() {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClass("secondary")}><LogOut size={16} aria-hidden="true" />Sign out</button>
    </form>
  );
}
