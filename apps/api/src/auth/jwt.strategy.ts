import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import type { JwtPayload } from "./jwt-payload";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      // Admins always have full access; every other account's access is exactly the set
      // of permissions an Admin chose for it at creation time (see UsersService).
      permissions: user.role.name === "Admin" ? ["*"] : user.permissions,
      branchId: user.branchId,
    };
  }
}
