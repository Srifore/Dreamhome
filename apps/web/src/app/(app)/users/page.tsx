"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Branch, Role, User } from "@/lib/types";
import { SUPERVISOR_FEATURES } from "@/lib/features";
import {
  AccessRestricted,
  Badge,
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Modal,
  PageHeader,
  QueryError,
  Select,
  Toggle,
} from "@/components/ui";

interface UserFormProps {
  existingUser?: User;
  onDone: () => void;
}

function UserForm({ existingUser, onDone }: UserFormProps) {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api.get<Role[]>("/roles") });
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => api.get<Branch[]>("/branches") });
  const selectableRoles = roles.data?.filter((r) => r.name !== "System") ?? [];

  const [form, setForm] = useState({
    name: existingUser?.name ?? "",
    email: existingUser?.email ?? "",
    password: "",
    phone: existingUser?.phone ?? "",
    branchId: existingUser?.branchId ?? "",
    roleId: existingUser?.roleId ?? "",
    permissions: existingUser?.permissions ?? [],
  });
  const [error, setError] = useState<string | null>(null);

  const selectedRole = selectableRoles.find((r) => r.id === form.roleId);
  const isAdmin = selectedRole?.name === "Admin";

  function toggleFeature(key: string, enabled: boolean) {
    setForm((prev) => ({
      ...prev,
      permissions: enabled ? [...prev.permissions, key] : prev.permissions.filter((p) => p !== key),
    }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      // On update, an empty field means "clear it" (send null); on create there's nothing to
      // clear, so omit it (undefined) instead of writing a literal null for a brand-new user.
      const emptyValue = existingUser ? null : undefined;
      const payload = {
        name: form.name,
        phone: form.phone || emptyValue,
        branchId: form.branchId || emptyValue,
        roleId: form.roleId,
        permissions: isAdmin ? [] : form.permissions,
      };
      if (existingUser) {
        return api.patch(`/users/${existingUser.id}`, payload);
      }
      return api.post("/users", { ...payload, email: form.email, password: form.password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save user"),
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="space-y-3"
    >
      <div>
        <Label>Name</Label>
        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          required
          disabled={!!existingUser}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      {!existingUser && (
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
      )}
      <div>
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <Label>Branch</Label>
        <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
          <option value="">No branch</option>
          {branches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Account Type</Label>
        <Select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
          <option value="">Select account type</option>
          {selectableRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      {form.roleId && (
        <div>
          {isAdmin ? (
            <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
              Admin accounts have full access to every feature.
            </div>
          ) : (
            <>
              <Label>Features this account can access</Label>
              <div className="space-y-2">
                {SUPERVISOR_FEATURES.map((feature) => (
                  <Toggle
                    key={feature.key}
                    label={feature.label}
                    description={feature.description}
                    checked={form.permissions.includes(feature.key)}
                    onChange={(checked) => toggleFeature(feature.key, checked)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Saving…" : existingUser ? "Save Changes" : "Create Account"}
      </Button>
    </form>
  );
}

function DeleteIconButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Delete permanently"
      title="Delete permanently"
      className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7h12Z"
        />
      </svg>
    </button>
  );
}

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canManage = hasPermission("users:manage");
  const queryClient = useQueryClient();
  const [modalUser, setModalUser] = useState<User | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/users"),
    enabled: canManage,
  });
  const staffUsers = users.data?.filter((u) => u.role.name !== "System") ?? [];

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to deactivate user"),
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}`, { isActive: true }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to activate user"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}/permanent`),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to delete user"),
  });

  function handleDelete(u: User) {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    remove.mutate(u.id);
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Users" />
        <AccessRestricted feature="Users" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Users" action={<Button onClick={() => setModalUser("new")}>New User</Button>} />

      {actionError && (
        <div className="mb-4">
          <ErrorMessage message={actionError} />
        </div>
      )}

      {users.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {users.isError && <QueryError error={users.error} onRetry={() => users.refetch()} />}

      {!!staffUsers.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Account Type</th>
                <th className="px-4 py-2">Branch</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {staffUsers.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2 font-medium text-neutral-900">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <Badge tone={u.role.name === "Admin" ? "blue" : "neutral"}>{u.role.name}</Badge>
                  </td>
                  <td className="px-4 py-2">{u.branch?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="secondary" onClick={() => setModalUser(u)}>
                      Edit
                    </Button>
                    {u.role.name !== "System" && u.id !== currentUser?.id && (
                      <>
                        {u.isActive ? (
                          <Button
                            variant="danger"
                            className="ml-2"
                            onClick={() => deactivate.mutate(u.id)}
                            disabled={deactivate.isPending}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="ml-2"
                            onClick={() => activate.mutate(u.id)}
                            disabled={activate.isPending}
                          >
                            Activate
                          </Button>
                        )}
                        {!u.isActive && (
                          <DeleteIconButton onClick={() => handleDelete(u)} disabled={remove.isPending} />
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={modalUser !== null}
        onClose={() => setModalUser(null)}
        title={modalUser === "new" ? "New User" : "Edit User"}
      >
        <UserForm
          existingUser={modalUser && modalUser !== "new" ? modalUser : undefined}
          onDone={() => setModalUser(null)}
        />
      </Modal>
    </div>
  );
}
