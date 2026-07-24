import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPath, getUserRole } from "@/lib/auth/rbac";

export default async function ForbiddenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const returnPath = user ? getDashboardPath(getUserRole(user)) : "/";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md border-primary/40">
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">[ ACCESS DENIED ]</CardTitle>
          <CardDescription>
            You do not have administrative privileges to access this area.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            render={<Link href={returnPath} />}
            nativeButton={false}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/80"
          >
            Return to your dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
