"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateIssueAction } from "@/lib/actions/issues";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default function EditIssueForm({
  issueId,
  volumeNumber: initialVolumeNumber,
  issueNumber: initialIssueNumber,
  publishedAt: initialPublishedAt,
}: {
  issueId: string;
  volumeNumber: number;
  issueNumber: number;
  publishedAt: Date | null;
}) {
  const router = useRouter();
  const [volumeNumber, setVolumeNumber] = useState(String(initialVolumeNumber));
  const [issueNumber, setIssueNumber] = useState(String(initialIssueNumber));
  const [publishedAt, setPublishedAt] = useState(toDateInputValue(initialPublishedAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const result = await updateIssueAction({
        issueId,
        volumeNumber: parseInt(volumeNumber, 10),
        issueNumber: parseInt(issueNumber, 10),
        publishedAt: publishedAt || null,
      });
      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not save issue.");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-volume">Volume Number</Label>
          <Input
            id="edit-volume"
            type="number"
            min={1}
            value={volumeNumber}
            onChange={(e) => {
              setVolumeNumber(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-issue">Issue Number</Label>
          <Input
            id="edit-issue"
            type="number"
            min={1}
            value={issueNumber}
            onChange={(e) => {
              setIssueNumber(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-published-at">Publication Date</Label>
          <Input
            id="edit-published-at"
            type="date"
            value={publishedAt}
            onChange={(e) => {
              setPublishedAt(e.target.value);
              setSaved(false);
            }}
          />
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" className="self-start" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        {saved && <span className="text-sm text-emerald-400">Saved.</span>}
      </div>
    </div>
  );
}
