"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { getDashboardPath, getUserRole, type Role } from "@/lib/auth/rbac";

const NAV_LINKS = [
  { title: "Home", href: "/" },
  { title: "About Journal", href: "/about-the-journal" },
  { title: "Editorial Board", href: "/editorial-board" },
  { title: "Author Guidelines", href: "/author-guidelines" },
  { title: "Submission", href: "/submission" },
  { title: "Archives", href: "/volumes-and-issues" },
  { title: "Search", href: "/search" },
  { title: "Contact Us", href: "/contact-us" },
];

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export default function SiteHeader() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<{ email: string; role: Role } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSession({ email: user.email ?? "", role: getUserRole(user) });
        setStatus("authenticated");
      } else {
        setSession(null);
        setStatus("unauthenticated");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const user = newSession?.user;
      if (user) {
        setSession({ email: user.email ?? "", role: getUserRole(user) });
        setStatus("authenticated");
      } else {
        setSession(null);
        setStatus("unauthenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const dashboardHref = session ? getDashboardPath(session.role) : "/dashboard";

  return (
    <header className="w-full bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="heading-display text-2xl tracking-widest text-primary hover:text-accent transition-colors">
            JMECPS
          </Link>

          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList>
              {NAV_LINKS.map((link) => (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink render={<Link href={link.href} />}>
                    {link.title}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              {status === "authenticated" && (
                <NavigationMenuItem>
                  <NavigationMenuLink render={<Link href={dashboardHref} target="_blank" rel="noopener noreferrer" />}>
                    Dashboard
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-2">
            {status === "loading" && (
              <div className="hidden sm:flex items-center gap-2" aria-live="polite" aria-busy="true">
                <span className="sr-only">Checking your session…</span>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            )}

            {status === "unauthenticated" && (
              <>
                <Button
                  render={<Link href="/register" />}
                  nativeButton={false}
                  variant="outline"
                  className="hidden sm:inline-flex border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Register
                </Button>
                <Button
                  render={<Link href="/login" />}
                  nativeButton={false}
                  className="hidden sm:inline-flex bg-accent text-accent-foreground hover:bg-accent/80"
                >
                  Login
                </Button>
              </>
            )}

            {status === "authenticated" && session && (
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  render={<Link href={dashboardHref} target="_blank" rel="noopener noreferrer" />}
                  nativeButton={false}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  Dashboard
                </Button>
                <Badge variant="outline" className="max-w-40 truncate border-border text-muted-foreground">
                  {session.email}
                </Badge>
                <Button onClick={handleSignOut} className="bg-accent text-accent-foreground hover:bg-accent/80">
                  Sign Out
                </Button>
              </div>
            )}

            <Sheet>
              <SheetTrigger
                suppressHydrationWarning
                render={<Button variant="outline" size="icon" className="lg:hidden" suppressHydrationWarning />}
              >
                <Menu className="size-5" />
                <span className="sr-only">Open navigation menu</span>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle className="heading-display text-primary">JMECPS</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-2 py-2.5 text-sm text-foreground hover:text-accent transition-colors"
                    >
                      {link.title}
                    </Link>
                  ))}

                  {status === "loading" && (
                    <div className="mt-3 flex flex-col gap-2" aria-live="polite" aria-busy="true">
                      <span className="sr-only">Checking your session…</span>
                      <Skeleton className="h-9 w-full" />
                    </div>
                  )}

                  {status === "authenticated" && session && (
                    <>
                      <Link
                        href={dashboardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-2.5 text-sm text-foreground hover:text-accent transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Badge variant="outline" className="my-1 w-fit max-w-full truncate border-border text-muted-foreground">
                        {session.email}
                      </Badge>
                      <Button onClick={handleSignOut} className="mt-2 bg-accent text-accent-foreground hover:bg-accent/80">
                        Sign Out
                      </Button>
                    </>
                  )}

                  {status === "unauthenticated" && (
                    <Button
                      render={<Link href="/login" />}
                      nativeButton={false}
                      className="mt-3 bg-accent text-accent-foreground hover:bg-accent/80"
                    >
                      Login
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
