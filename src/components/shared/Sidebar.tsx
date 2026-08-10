import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function SidebarContent() {
  return (
    <>
      <div className="mb-6 pb-6 border-b border-border">
        <h3 className="subheading-mono mb-3 text-accent">
          [ ABOUT JMECPS ]
        </h3>
        <p className="text-sm text-text opacity-80 leading-relaxed text-justify">
          Welcome to the Editorial Board of The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS). Our editorial team consists of distinguished academicians, researchers, scientists, and industry experts dedicated to maintaining excellence, integrity, and innovation in scholarly publishing.
        </p>
      </div>

      <h3 className="subheading-mono mb-6 border-b border-border pb-3 text-primary">
        [ RELATED CONTENT ]
      </h3>
      <ul className="space-y-4 font-mono text-sm">
        <li className="group flex items-center">
          <div className="w-1.5 h-1.5 bg-accent group-hover:scale-150 transition-none mr-3"></div>
          <Link href="/volumes-and-issues" className="text-text group-hover:text-accent transition-none uppercase">
            Latest Issue
          </Link>
        </li>
        <li className="group flex items-center">
          <div className="w-1.5 h-1.5 bg-primary group-hover:scale-150 transition-none mr-3"></div>
          <Link href="/submission" className="text-text group-hover:text-primary transition-none uppercase">
            Call for Papers
          </Link>
        </li>
        <li className="group flex items-center">
          <div className="w-1.5 h-1.5 bg-accent group-hover:scale-150 transition-none mr-3"></div>
          <Link href="/publication-charges" className="text-text group-hover:text-accent transition-none uppercase">
            Charges & Waiver Policy
          </Link>
        </li>
        <li className="group flex items-center">
          <div className="w-1.5 h-1.5 bg-primary group-hover:scale-150 transition-none mr-3"></div>
          <Link href="/subjects-covered" className="text-text group-hover:text-primary transition-none uppercase">
            Research Topics
          </Link>
        </li>
      </ul>

      <div className="mt-8 pt-6 border-t border-border">
        <div className="bg-background border border-border p-5">
          <h4 className="font-mono text-accent text-xs mb-3 uppercase tracking-widest">[ METRICS ]</h4>
          <div className="flex justify-between items-center text-xs font-mono text-text opacity-80 mb-2 border-b border-border pb-2">
            <span>IMPACT_FACTOR:</span>
            <span className="font-bold text-primary">4.2</span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono text-text opacity-80 pt-1">
            <span>ACCEPTANCE_RATE:</span>
            <span className="font-bold text-primary">28%</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <aside className="w-full h-full">
      <div className="relative overflow-hidden bg-card border border-border sticky top-24">
        <div className={user ? "p-8" : "p-8 blur-sm select-none pointer-events-none opacity-60"} aria-hidden={!user}>
          <SidebarContent />
        </div>

        {!user && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-card/80 backdrop-blur-[2px]">
            <div className="w-10 h-10 mb-3 rounded-full bg-accent/10 border border-accent/40 flex items-center justify-center text-accent text-base">
              🔒
            </div>
            <p className="text-xs text-text opacity-80 mb-4 max-w-[220px]">
              Log in or register to view journal metrics and related content.
            </p>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-widest bg-accent text-accent-foreground hover:bg-accent/80 transition-none"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-widest border border-accent text-accent hover:bg-accent/10 transition-none"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
