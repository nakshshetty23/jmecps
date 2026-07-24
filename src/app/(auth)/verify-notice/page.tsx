import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function VerifyNoticePage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Check Your Email</CardTitle>
          <CardDescription>
            Please verify your email address before continuing. Check your inbox for the
            confirmation link we sent when you registered.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
