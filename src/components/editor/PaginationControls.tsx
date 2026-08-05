import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PaginationControls({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  function hrefFor(targetPage: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(targetPage));
    return `/review?${params.toString()}`;
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button size="sm" variant="outline" disabled>
            Previous
          </Button>
        ) : (
          <Button size="sm" variant="outline" render={<Link href={hrefFor(page - 1)} />} nativeButton={false}>
            Previous
          </Button>
        )}
        {page >= totalPages ? (
          <Button size="sm" variant="outline" disabled>
            Next
          </Button>
        ) : (
          <Button size="sm" variant="outline" render={<Link href={hrefFor(page + 1)} />} nativeButton={false}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
