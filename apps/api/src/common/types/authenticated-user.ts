export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  branchId: string | null;
}
