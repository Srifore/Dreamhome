import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.productReview.findMany({
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        product: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }
}
