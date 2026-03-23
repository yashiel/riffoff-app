"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/features/shared/StatusBadge";
import { listUsers, changeUserRole, type AdminUserRow } from "@/actions/admin";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/lib/appwrite/types";

const ROLES: UserRole[] = ["attendee", "artist", "organiser", "admin"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasFetchedRef = useRef(false);

  function fetchUsers(p = page, q = search) {
    startTransition(async () => {
      const result = await listUsers(p, q || undefined);
      setUsers(result.users);
      setTotal(result.total);
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

  function handleRoleChange(profileId: string, newRole: UserRole) {
    if (!confirm(`Change this user's role to "${newRole}"?`)) return;
    startTransition(async () => {
      const result = await changeUserRole(profileId, newRole);
      if (result.error) {
        alert(result.error);
      } else {
        fetchUsers();
      }
    });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="font-display text-[28px]">User Management</h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {total} users on the platform
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-muted-foreground outline-none focus:border-[rgba(255,255,255,0.3)]"
        />
      </form>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)] text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Role</th>
              <th className="pb-3 pr-4 font-medium">Joined</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.profileId}
                className="border-b border-[rgba(255,255,255,0.03)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
              >
                <td className="py-3 pr-4">
                  <p className="font-medium text-white">{user.displayName ?? "No name"}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{user.userId.slice(0, 12)}...</p>
                </td>
                <td className="py-3 pr-4">
                  <StatusBadge status={user.role} />
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {formatDate(user.createdAt, { dateStyle: "medium" })}
                </td>
                <td className="py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.profileId, e.target.value as UserRole)}
                    disabled={isPending}
                    className="rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] px-2 py-1 text-[12px] text-white outline-none"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => { setPage(page - 1); fetchUsers(page - 1); }}
            disabled={page <= 1 || isPending}
            className="btn-ghost !py-1.5 !text-[11px] disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-[13px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => { setPage(page + 1); fetchUsers(page + 1); }}
            disabled={page >= totalPages || isPending}
            className="btn-ghost !py-1.5 !text-[11px] disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
