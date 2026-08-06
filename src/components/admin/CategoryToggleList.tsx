"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toggleCategoryEnabledAction, type CategorySettingRow } from "@/lib/actions/admin-system";

export default function CategoryToggleList({ categories }: { categories: CategorySettingRow[] }) {
  const router = useRouter();
  // Optimistic local copy — the checkbox is controlled, so without this it
  // would visually snap back to the server value until router.refresh()
  // resolves, which reads as "my click didn't register."
  const [localCategories, setLocalCategories] = useState(categories);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function handleToggle(key: string, enabled: boolean) {
    setLocalCategories((prev) => prev.map((c) => (c.key === key ? { ...c, enabled } : c)));
    setPendingKey(key);
    try {
      const result = await toggleCategoryEnabledAction({ key, enabled });
      if (!result.success) {
        setLocalCategories((prev) => prev.map((c) => (c.key === key ? { ...c, enabled: !enabled } : c)));
        return;
      }
      router.refresh();
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {localCategories.map((category) => (
        <div key={category.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">{category.label}</span>
            <Badge
              variant="outline"
              className={`text-[0.65rem] ${category.enabled ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground"}`}
            >
              {category.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={category.enabled}
              disabled={pendingKey === category.key}
              onChange={(e) => handleToggle(category.key, e.target.checked)}
              className="accent-primary"
            />
            Available on new submissions
          </label>
        </div>
      ))}
    </div>
  );
}
