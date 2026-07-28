import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";

function makeContext(user: any): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("PermissionsGuard", () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it("allows the request through when the route has no @RequirePermissions decorator", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext(null))).toBe(true);
  });

  it("allows the request through when the required-permissions list is empty", () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext(null))).toBe(true);
  });

  it("denies an unauthenticated request against a protected route", () => {
    reflector.getAllAndOverride.mockReturnValue(["sales:write"]);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });

  it("lets an Admin ('*') through regardless of the specific permission required", () => {
    reflector.getAllAndOverride.mockReturnValue(["users:manage"]);
    expect(guard.canActivate(makeContext({ permissions: ["*"] }))).toBe(true);
  });

  it("allows a user holding exactly the required permission", () => {
    reflector.getAllAndOverride.mockReturnValue(["sales:write"]);
    expect(guard.canActivate(makeContext({ permissions: ["sales:write", "crm:write"] }))).toBe(true);
  });

  it("throws ForbiddenException for a user missing the required permission", () => {
    reflector.getAllAndOverride.mockReturnValue(["sales:write"]);
    expect(() => guard.canActivate(makeContext({ permissions: ["crm:write"] }))).toThrow(
      ForbiddenException,
    );
  });

  it("requires ALL listed permissions, not just one, when multiple are specified", () => {
    reflector.getAllAndOverride.mockReturnValue(["sales:write", "crm:write"]);
    expect(() => guard.canActivate(makeContext({ permissions: ["sales:write"] }))).toThrow(
      ForbiddenException,
    );
  });

  it("does not treat holding many unrelated permissions as equivalent to holding '*'", () => {
    reflector.getAllAndOverride.mockReturnValue(["users:manage"]);
    expect(() =>
      guard.canActivate(makeContext({ permissions: ["sales:write", "crm:write", "inventory:write"] })),
    ).toThrow(ForbiddenException);
  });
});
