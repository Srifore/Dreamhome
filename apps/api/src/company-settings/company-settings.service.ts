import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateCompanySettingsDto } from "./dto/update-company-settings.dto";

const SINGLETON_ID = "default";
const UPLOADS_ROOT = join(process.cwd(), "uploads", "company");

const EMPTY_FIELDS = {
  legalName: null,
  gstin: null,
  address: null,
  city: null,
  state: null,
  pincode: null,
  phone: null,
  email: null,
  website: null,
  logoUrl: null,
  bankAccountName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankName: null,
  bankBranch: null,
  defaultTermsAndConditions: null,
  defaultNotes: null,
} as const;

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class CompanySettingsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async get() {
    const row = await this.prisma.companySettings.findUnique({ where: { id: SINGLETON_ID } });
    return row ?? { id: SINGLETON_ID, ...EMPTY_FIELDS, updatedAt: null };
  }

  async update(dto: UpdateCompanySettingsDto) {
    const data = {
      legalName: clean(dto.legalName),
      gstin: clean(dto.gstin),
      address: clean(dto.address),
      city: clean(dto.city),
      state: clean(dto.state),
      pincode: clean(dto.pincode),
      phone: clean(dto.phone),
      email: clean(dto.email),
      website: clean(dto.website),
      logoUrl: clean(dto.logoUrl),
      bankAccountName: clean(dto.bankAccountName),
      bankAccountNumber: clean(dto.bankAccountNumber),
      bankIfsc: clean(dto.bankIfsc),
      bankName: clean(dto.bankName),
      bankBranch: clean(dto.bankBranch),
      defaultTermsAndConditions: clean(dto.defaultTermsAndConditions),
      defaultNotes: clean(dto.defaultNotes),
    };
    return this.prisma.companySettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
  }

  /** Internal use only (e.g. by QuotesService for the CGST/SGST vs IGST split) — just the state. */
  async getState(): Promise<string | null> {
    const row = await this.prisma.companySettings.findUnique({
      where: { id: SINGLETON_ID },
      select: { state: true },
    });
    return row?.state ?? null;
  }

  /** Printed top-left on every quote/invoice, next to the company name and address. */
  async setLogo(file: Express.Multer.File) {
    const current = await this.get();
    if (current.logoUrl) {
      await this.deleteUploadedFile(current.logoUrl);
    }

    await mkdir(UPLOADS_ROOT, { recursive: true });
    const filename = `logo-${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(join(UPLOADS_ROOT, filename), file.buffer);

    const baseUrl = this.config.get<string>("PUBLIC_API_URL", "http://localhost:3001");
    const logoUrl = `${baseUrl}/uploads/company/${filename}`;
    return this.prisma.companySettings.upsert({
      where: { id: SINGLETON_ID },
      update: { logoUrl },
      create: { id: SINGLETON_ID, ...EMPTY_FIELDS, logoUrl },
    });
  }

  async removeLogo() {
    const current = await this.get();
    if (current.logoUrl) {
      await this.deleteUploadedFile(current.logoUrl);
    }
    return this.prisma.companySettings.upsert({
      where: { id: SINGLETON_ID },
      update: { logoUrl: null },
      create: { id: SINGLETON_ID, ...EMPTY_FIELDS },
    });
  }

  private async deleteUploadedFile(fileUrl: string) {
    const marker = "/uploads/";
    const index = fileUrl.indexOf(marker);
    if (index === -1) return;
    const relativePath = fileUrl.slice(index + marker.length);
    await unlink(join(process.cwd(), "uploads", relativePath)).catch(() => undefined);
  }
}
