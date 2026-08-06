import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import UserSearchBar from "@/components/admin/UserSearchBar";
import UserRoleTable from "@/components/admin/UserRoleTable";
import PaginationControls from "@/components/editor/PaginationControls";
import { getUsersPageAction } from "@/lib/actions/admin-system";
import { createClient } from "@/lib/supabase/server";

export default async function RoleManagementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const result = await getUsersPageAction({ page, search: params.search });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Role Management</CardTitle>
          <CardDescription>{result.totalCount} registered users.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <UserSearchBar />
          <UserRoleTable rows={result.rows} currentUserId={currentUser?.id ?? ""} />
          <PaginationControls
            page={result.page}
            totalPages={result.totalPages}
            searchParams={params}
            basePath="/control-center/users"
          />
        </CardContent>
      </Card>
    </div>
  );
}
