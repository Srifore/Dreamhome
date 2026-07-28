"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge, Button, Card, ErrorMessage, Input, Label, PageHeader } from "@/components/ui";

function ChangeEmailForm() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.patch<{ email: string }>("/auth/me/email", { currentPassword, newEmail }),
    onSuccess: async () => {
      setSuccess(true);
      setCurrentPassword("");
      await refreshUser();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update email"),
  });

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Change Email</h2>
      <p className="mb-4 text-xs text-slate-500">You&apos;ll use this address to sign in from now on.</p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          setSuccess(false);
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <Label>New Email</Label>
          <Input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
        <div>
          <Label>Current Password</Label>
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Confirm it's you"
          />
        </div>
        {error && <ErrorMessage message={error} />}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Email updated.
          </div>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Update Email"}
        </Button>
      </form>
    </Card>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.patch("/auth/me/password", { currentPassword, newPassword }),
    onSuccess: () => {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update password"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match");
      return;
    }
    mutation.mutate();
  }

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Change Password</h2>
      <p className="mb-4 text-xs text-slate-500">Use at least 8 characters.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Current Password</Label>
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>New Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>Confirm New Password</Label>
          <Input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <ErrorMessage message={error} />}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Password updated.
          </div>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Update Password"}
        </Button>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" />

      <Card className="mb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Name</dt>
            <dd className="font-medium text-slate-900">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Account Type</dt>
            <dd>
              <Badge tone={user?.roleName === "Admin" ? "blue" : "neutral"}>{user?.roleName}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <div className="space-y-6">
        <ChangeEmailForm />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
