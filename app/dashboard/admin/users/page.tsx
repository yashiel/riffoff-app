"use client";
export const dynamic = "force-dynamic";

import { useState, useTransition, useEffect, useRef, useId } from "react";
import { Search, ChevronLeft, ChevronRight, Users, ShieldAlert } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { listUsers, changeUserRole, type AdminUserRow } from "@/actions/admin";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/appwrite/types";

const ROLES: UserRole[] = ["attendee", "artist", "organiser", "admin"];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  attendee: "Can browse events and purchase tickets",
  artist: "Can apply to perform at events",
  organiser: "Can create and manage events",
  admin: "Full platform access",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);
  const searchId = useId();
  const tableId = useId();
  const liveRegionId = useId();
  const [statusMessage, setStatusMessage] = useState("");

  function fetchUsers(p = page, q = search) {
    startTransition(async () => {
      const result = await listUsers(p, q || undefined);
      setUsers(result.users);
      setTotal(result.total);
      setStatusMessage(
        `Showing ${result.users.length} of ${result.total} users${q ? ` matching "${q}"` : ""}`
      );
    });
  }

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUsers(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  }

  function handleRoleChange(user: AdminUserRow, newRole: UserRole) {
    if (newRole === user.role) return;
    if (
      !confirm(
        `Change ${user.displayName ?? "this user"}'s role from "${user.role}" to "${newRole}"?\n\n${ROLE_DESCRIPTIONS[newRole]}`
      )
    )
      return;
    startTransition(async () => {
      const result = await changeUserRole(user.profileId, newRole);
      if (result.error) {
        alert(result.error);
        setStatusMessage(`Error: ${result.error}`);
      } else {
        setStatusMessage(
          `${user.displayName ?? "User"}'s role changed to ${newRole}`
        );
        fetchUsers();
      }
    });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-8">
      {/* Live region for screen readers */}
      <div
        id={liveRegionId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {statusMessage}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">User Management</h1>
            <p className="text-base text-muted-foreground">
              {total} {total === 1 ? "user" : "users"} on the platform
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} role="search" aria-label="Search users">
        <div className="relative max-w-sm">
          <label htmlFor={searchId} className="sr-only">
            Search users by name
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id={searchId}
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </form>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-lg border border-border bg-card"
        role="region"
        aria-label="Users table"
        tabIndex={0}
      >
        <table id={tableId} className="w-full text-base" aria-label="Platform users">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th
                scope="col"
                className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                User
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Role
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell"
              >
                Joined
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Change Role
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 && !isPending && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <p className="text-base text-muted-foreground">
                    {search ? `No users found matching "${search}"` : "No users found"}
                  </p>
                </td>
              </tr>
            )}
            {isPending && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <p className="text-base text-muted-foreground">Loading users...</p>
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr
                key={user.profileId}
                className="transition-colors hover:bg-muted/30"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                      aria-hidden="true"
                    >
                      {(user.displayName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {user.displayName ?? "No name"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground font-mono">
                        {user.userId.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={user.role} />
                </td>
                <td className="hidden px-4 py-3.5 text-muted-foreground sm:table-cell">
                  <time dateTime={user.createdAt}>
                    {formatDate(user.createdAt, { dateStyle: "medium" })}
                  </time>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`role-${user.profileId}`}
                      className="sr-only"
                    >
                      Change role for {user.displayName ?? "user"}
                    </label>
                    <select
                      id={`role-${user.profileId}`}
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user, e.target.value as UserRole)
                      }
                      disabled={isPending}
                      className="min-w-[120px] cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-base font-medium text-foreground capitalize shadow-sm outline-none transition-colors hover:bg-muted focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role} className="capitalize">
                          {role}
                        </option>
                      ))}
                    </select>
                    {user.role === "admin" && (
                      <ShieldAlert
                        className="size-4 text-destructive"
                        aria-label="Admin user"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Users pagination" className="flex items-center justify-center gap-1">
          <button
            onClick={() => {
              const newPage = page - 1;
              setPage(newPage);
              fetchUsers(newPage);
            }}
            disabled={page <= 1 || isPending}
            aria-label="Go to previous page"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <span className="px-4 text-base text-muted-foreground" aria-current="page">
            Page <span className="font-medium text-foreground">{page}</span> of{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>

          <button
            onClick={() => {
              const newPage = page + 1;
              setPage(newPage);
              fetchUsers(newPage);
            }}
            disabled={page >= totalPages || isPending}
            aria-label="Go to next page"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
