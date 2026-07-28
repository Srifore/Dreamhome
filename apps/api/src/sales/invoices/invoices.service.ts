import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.invoice.findMany({
      include: { salesOrder: { include: { customer: true, b2bAccount: true } }, payments: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { salesOrder: { include: { customer: true, b2bAccount: true } }, payments: true },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }
    return invoice;
  }

  /**
   * Recomputes status from recorded payments; overdue is derived at read time rather than via
   * a scheduled job. Accepts an optional transaction client so callers can bundle this with the
   * payment write that triggered it, atomically.
   */
  async recomputeStatus(id: string, db: Db = this.prisma) {
    const invoice = await db.invoice.findUniqueOrThrow({
      where: { id },
      include: { payments: true },
    });

    const paidTotal = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    let status: InvoiceStatus;
    if (paidTotal >= Number(invoice.amount)) {
      status = InvoiceStatus.PAID;
    } else if (paidTotal > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    } else if (invoice.dueDate < new Date()) {
      status = InvoiceStatus.OVERDUE;
    } else {
      status = InvoiceStatus.UNPAID;
    }

    return db.invoice.update({ where: { id }, data: { status } });
  }
}
