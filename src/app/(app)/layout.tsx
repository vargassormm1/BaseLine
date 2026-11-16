import Link from "next/link";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { Rail, TabBar, Wordmark } from "@/components/shell/Nav";
import { attentionCount } from "@/lib/ui/inbox";
import { Toaster } from "@/components/ui/Toast";

/** Signed-in frame: rail on desktop, tab bar on phones. Every page inside also calls requirePlayer(). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePlayer();
  const board = await loadBoard(s.sb);
  const me = board.byId.get(s.me);
  const nav = { meHref: me ? `/players/${me.username}` : "/settings", attention: attentionCount(board, s.me) };
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-4 pt-6 pb-5 lg:flex" aria-label="Sidebar">
        <Link href="/home" className="mb-7 px-2" aria-label="Baseline home"><Wordmark /></Link>
        <Rail {...nav} />
      </aside>
      <main id="main" className="pt-safe pb-tabbar mx-auto w-full max-w-[1040px] px-4 sm:px-6 lg:pb-16 lg:pt-8">{children}</main>
      <TabBar {...nav} />
      <Toaster />
    </div>
  );
}
