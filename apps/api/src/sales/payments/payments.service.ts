import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private invoicesService: InvoicesService,
  ) {}

  findByInvoice(invoiceId: string) {
    return this.prisma.payment.findMany({ where: { invoiceId }, orderBy: { paidAt: "desc" } });
  }

  async create(dto: CreatePaymentDto, recordedById: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });
    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    const alreadyPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Number(invoice.amount) - alreadyPaid;
    if (dto.amount > outstanding) {
      throw new BadRequestException(
        `Payment of ${dto.amount} exceeds the outstanding balance of ${outstanding.toFixed(2)}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          recordedById,
        },
      });

      await this.invoicesService.recomputeStatus(dto.invoiceId, tx);

      return payment;
    });
  }
}
