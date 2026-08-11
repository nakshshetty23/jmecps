import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
  // Strip any client-supplied x-user-* headers before they can reach
  // downstream Server Components. proxy.ts re-sets trusted values on top
  // of this for routes it authorizes (src/proxy.ts), but "public"/"auth"
  // routes return this function's response as-is with no re-set step — so
  // without this, a request could forge its own x-user-role header and
  // have it forwarded unchanged on those paths.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-user-id");
  requestHeaders.delete("x-user-role");
  requestHeaders.delete("x-user-email");

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() (not getSession()) actually revalidates the token against
  // Supabase's Auth server — required here to safely refresh the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}
