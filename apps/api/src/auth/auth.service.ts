import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt-payload";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens({ sub: user.id, email: user.email, roleId: user.roleId });
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.issueTokens({ sub: user.id, email: user.email, roleId: user.roleId });
  }

  /** Requires the current password so a merely-still-valid access token can't silently take over
   *  the account's login identity if a session were ever hijacked. */
  async changeEmail(userId: string, currentPassword: string, newEmail: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    if (newEmail === user.email) {
      return { email: user.email };
    }

    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: { email: true },
    });
    return updated;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException("New password must be different from the current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

  private async issueTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: parseInt(this.config.get<string>("JWT_ACCESS_EXPIRES_IN_SECONDS", "900"), 10),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: parseInt(
          this.config.get<string>("JWT_REFRESH_EXPIRES_IN_SECONDS", "604800"),
          10,
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
