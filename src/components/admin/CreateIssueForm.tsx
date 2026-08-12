"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createIssueAction } from "@/lib/actions/issues";

export default function CreateIssueForm() {
  const router = useRouter();
  const [volumeNumber, setVolumeNumber] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setSaving(true);
    try {
      const result = await createIssueAction({
        volumeNumber: parseInt(volumeNumber, 10),
        issueNumber: parseInt(issueNumber, 10),
        publishedAt: publishedAt || null,
      });
      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not create issue.");
        return;
      }
      setVolumeNumber("");
      setIssueNumber("");
      setPublishedAt("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-foreground">Create a new issue</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-volume">Volume Number</Label>
          <Input
            id="new-volume"
            type="number"
            min={1}
            value={volumeNumber}
            onChange={(e) => setVolumeNumber(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-issue">Issue Number</Label>
          <Input
            id="new-issue"
            type="number"
            min={1}
            value={issueNumber}
            onChange={(e) => setIssueNumber(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-published-at">Publication Date (optional)</Label>
          <Input id="new-published-at" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        size="sm"
        className="self-start"
        disabled={saving || !volumeNumber || !issueNumber}
        onClick={handleCreate}
      >
        {saving ? "Creating…" : "Create Issue"}
      </Button>
    </div>
  );
}
