import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import JournalSettingsForm from "@/components/admin/JournalSettingsForm";
import CategoryToggleList from "@/components/admin/CategoryToggleList";
import { getJournalSettingsAction, getCategorySettingsAction } from "@/lib/actions/admin-system";

export default async function JournalSettingsPage() {
  const [settings, categories] = await Promise.all([getJournalSettingsAction(), getCategorySettingsAction()]);

  if (!settings) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Could not load journal settings.</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <div>
        <h1 className="heading-display text-3xl text-primary">Journal Settings</h1>
        <p className="mt-1 text-muted-foreground">Global platform configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Journal Info &amp; Workflow Defaults</CardTitle>
          <CardDescription>
            The word limit and stale-review threshold take effect immediately for new drafts and the editorial
            queue — no deploy required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JournalSettingsForm initial={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Categories</CardTitle>
          <CardDescription>
            Disabling a category removes it from new submissions&apos; dropdown — manuscripts already filed under it
            are unaffected. Adding a genuinely new category (not just toggling these 7) would need a matching
            label added in code, so isn&apos;t supported from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryToggleList categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tracks</CardTitle>
          <CardDescription>
            Tracks are a fixed boolean flag on each manuscript (sit_conference_flag), not a configurable list —
            changing that to a dynamic set would touch the upload pipeline, search filters, and the editorial
            queue. Not built here to avoid a disproportionate schema change for a fixed 2-value field.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary bg-primary/10">
            STANDARD
          </Badge>
          <Badge variant="outline" className="font-mono text-xs border-accent/40 text-accent bg-accent/10">
            SIT_CONF
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
