import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminReviewQueuePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">
            Admin / Editor Review Queue
          </CardTitle>
          <CardDescription>Coming in a later session.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
