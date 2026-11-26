import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthClient, isAuthConfigured } from "@/lib/auth";
import { QueryProvider } from "@/components/query-provider";

export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isAuthConfigured()) redirect("/");
  const session = await getAuthClient().getSession();
  if (!session) redirect("/auth/login?returnTo=%2Fcollections");
  const name = session.user.name ?? session.user.nickname ?? "Your account";
  return (
    <QueryProvider>
      <header className="global-header">
        <Link className="brand" href="/collections">
          Curate<span>DS</span>
          <i aria-hidden="true" />
        </Link>
        <div className="account">
          <span>{name}</span>
          <a href="/auth/logout">Sign out</a>
        </div>
      </header>
      <main id="main">{children}</main>
    </QueryProvider>
  );
}
