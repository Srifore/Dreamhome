import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return "Hello World!";
  }

  async checkHealth(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch (err) {
      this.logger.error(`Health check DB connectivity failure: ${err instanceof Error ? err.message : err}`);
      throw new ServiceUnavailableException("Database connectivity check failed");
    }
  }
}
