import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ServiceTicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DomainEvents,
  type ServiceTicketCreatedEvent,
} from "../../common/events/domain-events";
import { CreateServiceTicketDto } from "./dto/create-service-ticket.dto";
import { UpdateServiceTicketDto } from "./dto/update-service-ticket.dto";

@Injectable()
export class ServiceTicketsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  findAll() {
    return this.prisma.serviceTicket.findMany({
      include: {
        productUnit: { include: { product: true } },
        customer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.serviceTicket.findUnique({
      where: { id },
      include: {
        productUnit: { include: { product: { include: { brand: true } } } },
        customer: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException("Service ticket not found");
    }
    return ticket;
  }

  async create(dto: CreateServiceTicketDto) {
    const productUnit = await this.prisma.productUnit.findUnique({
      where: { id: dto.productUnitId },
    });
    if (!productUnit) {
      throw new NotFoundException("Product unit not found");
    }
    if (productUnit.customerId !== dto.customerId) {
      throw new BadRequestException("This product unit does not belong to the given customer");
    }
    if (dto.assignedToId) {
      await this.assertActiveUser(dto.assignedToId);
    }

    const status = dto.assignedToId ? ServiceTicketStatus.ASSIGNED : ServiceTicketStatus.OPEN;
    const ticket = await this.prisma.serviceTicket.create({
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status,
      },
    });
    this.events.emit(DomainEvents.SERVICE_TICKET_CREATED, {
      serviceTicketId: ticket.id,
    } satisfies ServiceTicketCreatedEvent);
    return ticket;
  }

  async update(id: string, dto: UpdateServiceTicketDto) {
    await this.findOne(id);
    if (dto.assignedToId) {
      await this.assertActiveUser(dto.assignedToId);
    }
    const resolvedAt =
      dto.status === ServiceTicketStatus.RESOLVED ? new Date() : undefined;

    return this.prisma.serviceTicket.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        resolvedAt,
      },
    });
  }

  private async assertActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new BadRequestException("Cannot assign to an inactive or unknown user");
    }
  }
}
