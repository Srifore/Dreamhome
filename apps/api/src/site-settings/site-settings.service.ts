import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const SINGLETON_ID = "default";

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SINGLETON_ID } });
    return { mapsUrl: row?.mapsUrl ?? null };
  }

  async update(mapsUrl: string | null) {
    const row = await this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { mapsUrl },
      create: { id: SINGLETON_ID, mapsUrl },
    });
    return { mapsUrl: row.mapsUrl };
  }
}
