"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateJournalSettingsAction, type JournalSettingsData } from "@/lib/actions/admin-system";

export default function JournalSettingsForm({ initial }: { initial: JournalSettingsData }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof JournalSettingsData>(key: K, value: JournalSettingsData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const result = await updateJournalSettingsAction(values);
      if (!result.success) {
        setError(Object.values(result.errors ?? {})[0]?.[0] ?? "Could not save settings.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="journal-title">Journal Title</Label>
          <Input id="journal-title" value={values.journalTitle} onChange={(e) => update("journalTitle", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issn">ISSN</Label>
          <Input id="issn" value={values.issn} onChange={(e) => update("issn", e.target.value)} placeholder="0000-0000" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contact-email">Contact Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={values.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publisher-name">Publisher Name</Label>
          <Input id="publisher-name" value={values.publisherName} onChange={(e) => update("publisherName", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="word-limit">Abstract Word Limit</Label>
          <Input
            id="word-limit"
            type="number"
            min={50}
            max={2000}
            value={values.abstractWordLimit}
            onChange={(e) => update("abstractWordLimit", parseInt(e.target.value, 10) || 0)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stale-threshold">Stale Review Alert Threshold (days)</Label>
          <Input
            id="stale-threshold"
            type="number"
            min={1}
            max={90}
            value={values.staleReviewThresholdDays}
            onChange={(e) => update("staleReviewThresholdDays", parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving} className="self-start">
          {saving ? "Saving…" : "Save Settings"}
        </Button>
        {saved && <span className="text-sm text-emerald-400">Saved.</span>}
      </div>
    </div>
  );
}
