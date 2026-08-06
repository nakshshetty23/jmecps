import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPlatformMetricsAction } from "@/lib/actions/admin-system";

export default async function SuperAdminControlCenterPage() {
  const metrics = await getPlatformMetricsAction();

  const volumeTiles = metrics
    ? [
        { label: "Total Manuscripts", value: metrics.totalManuscripts },
        { label: "Active Submissions", value: metrics.activeSubmissions },
        { label: "Published Papers", value: metrics.publishedPapers },
        { label: "Total Registered Users", value: metrics.totalUsers },
      ]
    : [];

  const activityTiles = metrics
    ? [
        { label: "Registrations (24h)", value: metrics.registrationsLast24h },
        { label: "Registrations (7d)", value: metrics.registrationsLast7d },
        { label: "Submissions (7d)", value: metrics.submissionsLast7d },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display text-3xl text-primary">Super Admin Control Center</h1>
          <p className="mt-1 text-muted-foreground">Platform health, role management, and journal configuration.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" render={<Link href="/control-center/users" />} nativeButton={false}>
            Role Management
          </Button>
          <Button size="sm" variant="outline" render={<Link href="/control-center/settings" />} nativeButton={false}>
            Journal Settings
          </Button>
        </div>
      </div>

      {!metrics ? (
        <Card className="card-terminal">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Could not load platform metrics.</CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <p className="subheading-mono text-xs">System Volume</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {volumeTiles.map((tile) => (
                <div key={tile.label} className="card-terminal flex flex-col gap-1">
                  <span className="font-mono text-2xl text-primary">{tile.value}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{tile.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <p className="subheading-mono text-xs">Activity Velocity</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {activityTiles.map((tile) => (
                <div key={tile.label} className="card-terminal flex flex-col gap-1">
                  <span className="font-mono text-2xl text-accent">{tile.value}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{tile.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <p className="subheading-mono text-xs">Database &amp; Storage</p>
            <Card>
              <CardContent className="flex flex-col gap-2 pt-6">
                <p className="text-sm">
                  <span className="font-mono text-lg text-primary">{metrics.filesAttached}</span>{" "}
                  <span className="text-muted-foreground">manuscripts with a file attached (real row count).</span>
                </p>
                <CardDescription>
                  Byte-level storage consumption isn&apos;t tracked — file size was never persisted at upload time,
                  and there&apos;s no R2 API wired up to query the bucket directly. Showing a fabricated MB/GB
                  number would be worse than not showing one.
                </CardDescription>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
