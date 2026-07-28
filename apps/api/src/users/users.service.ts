import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  isActive: true,
  roleId: true,
  branchId: true,
  permissions: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({ select: SAFE_SELECT, orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        roleId: dto.roleId,
        branchId: dto.branchId,
        permissions: excludeAdminOnlyPermissions(dto.permissions) ?? [],
      },
      select: SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.findOne(id);

    if (dto.roleId && dto.roleId !== existing.roleId) {
      const newRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (existing.role.name === "Admin" && newRole?.name !== "Admin") {
        await this.assertNotLastActiveAdmin(existing);
      }
    }

    // dto.permissions is undefined when this update doesn't touch permissions at all (e.g.
    // editing just name/phone) — must stay undefined so Prisma leaves the column untouched,
    // rather than defaulting to [] and wiping out the account's existing grants.
    return this.prisma.user.update({
      where: { id },
      data: { ...dto, permissions: excludeAdminOnlyPermissions(dto.permissions) },
      select: SAFE_SELECT,
    });
  }

  async deactivate(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException("You cannot deactivate your own account");
    }
    const user = await this.findOne(id);
    await this.assertNotLastActiveAdmin(user);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
  }

  /**
   * Permanently removes an account. Only allowed once it's already deactivated (deactivate
   * first, via the DELETE :id route) — a safety gate against accidentally erasing someone who's
   * still meant to be using the system. Almost every other table (leads, interactions, orders,
   * quotes, payments…) references the user who created/owns it with no cascade, so this fails
   * with a clear message instead of a raw DB error for any account with real activity history —
   * deactivating (leaving it listed as Inactive) is the only option for those.
   */
  async remove(id: string) {
    const user = await this.findOne(id);
    if (user.isActive) {
      throw new BadRequestException("Deactivate this account before deleting it permanently");
    }
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ConflictException(
          "This account has historical records (leads, interactions, orders, etc.) and can't be permanently deleted — it will stay listed as Inactive.",
        );
      }
      throw err;
    }
    return { deleted: true };
  }

  /** Prevents locking everyone out of user management by removing/disabling the last Admin. */
  private async assertNotLastActiveAdmin(user: { role: { name: string }; isActive: boolean }) {
    if (user.role.name !== "Admin" || !user.isActive) return;
    const activeAdminCount = await this.prisma.user.count({
      where: { isActive: true, role: { name: "Admin" } },
    });
    if (activeAdminCount <= 1) {
      throw new BadRequestException("Cannot remove or deactivate the last active Admin account");
    }
  }
}

/**
 * Some permissions are Admin-only by design. Admin accounts already bypass this array entirely
 * (JwtStrategy resolves their permissions to ["*"] regardless of what's stored), so these strings
 * have no legitimate reason to ever be present here — strip them so they can never be granted to
 * a Supervisor, even if sent directly to the API. "settings:manage" gates WhatsApp/Instagram/
 * Facebook/AI credentials and the showroom location link — integration secrets and business
 * config an Admin shouldn't delegate.
 */
const ADMIN_ONLY_PERMISSIONS = ["users:manage", "settings:manage"];

function excludeAdminOnlyPermissions(permissions?: string[]): string[] | undefined {
  return permissions?.filter((p) => !ADMIN_ONLY_PERMISSIONS.includes(p));
}
