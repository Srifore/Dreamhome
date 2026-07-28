import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ServiceTicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEvents } from "../../common/events/domain-events";
import { ServiceTicketsService } from "./service-tickets.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateServiceTicketDto } from "./dto/create-service-ticket.dto";

describe("ServiceTicketsService", () => {
  let service: ServiceTicketsService;
  let prisma: PrismaMock;
  let events: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    events = { emit: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ServiceTicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    service = moduleRef.get(ServiceTicketsService);
  });

  describe("create", () => {
    it("throws NotFoundException for a nonexistent product unit", async () => {
      prisma.productUnit.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ productUnitId: "missing", customerId: "cust-1" } as CreateServiceTicketDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects a product unit that doesn't belong to the given customer", async () => {
      prisma.productUnit.findUnique.mockResolvedValue({ id: "unit-1", customerId: "cust-other" });
      await expect(
        service.create({ productUnitId: "unit-1", customerId: "cust-1" } as CreateServiceTicketDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("defaults to OPEN when no assignee is given", async () => {
      prisma.productUnit.findUnique.mockResolvedValue({ id: "unit-1", customerId: "cust-1" });
      prisma.serviceTicket.create.mockImplementation(({ data }: any) => ({ id: "ticket-1", ...data }));

      const result = await service.create({
        productUnitId: "unit-1",
        customerId: "cust-1",
      } as CreateServiceTicketDto);

      expect(result.status).toBe(ServiceTicketStatus.OPEN);
    });

    it("sets ASSIGNED and validates the assignee is an active user", async () => {
      prisma.productUnit.findUnique.mockResolvedValue({ id: "unit-1", customerId: "cust-1" });
      prisma.user.findUnique.mockResolvedValue({ id: "tech-1", isActive: true });
      prisma.serviceTicket.create.mockImplementation(({ data }: any) => ({ id: "ticket-1", ...data }));

      const result = await service.create({
        productUnitId: "unit-1",
        customerId: "cust-1",
        assignedToId: "tech-1",
      } as CreateServiceTicketDto);

      expect(result.status).toBe(ServiceTicketStatus.ASSIGNED);
    });

    it("rejects assigning to an inactive technician", async () => {
      prisma.productUnit.findUnique.mockResolvedValue({ id: "unit-1", customerId: "cust-1" });
      prisma.user.findUnique.mockResolvedValue({ id: "tech-1", isActive: false });

      await expect(
        service.create({
          productUnitId: "unit-1",
          customerId: "cust-1",
          assignedToId: "tech-1",
        } as CreateServiceTicketDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("emits a SERVICE_TICKET_CREATED domain event", async () => {
      prisma.productUnit.findUnique.mockResolvedValue({ id: "unit-1", customerId: "cust-1" });
      prisma.serviceTicket.create.mockResolvedValue({ id: "ticket-1" });

      await service.create({ productUnitId: "unit-1", customerId: "cust-1" } as CreateServiceTicketDto);

      expect(events.emit).toHaveBeenCalledWith(DomainEvents.SERVICE_TICKET_CREATED, {
        serviceTicketId: "ticket-1",
      });
    });
  });

  describe("update", () => {
    it("stamps resolvedAt when the status transitions to RESOLVED", async () => {
      prisma.serviceTicket.findUnique.mockResolvedValue({ id: "ticket-1" });
      prisma.serviceTicket.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("ticket-1", { status: ServiceTicketStatus.RESOLVED });

      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it("leaves resolvedAt unset for a non-resolving status change", async () => {
      prisma.serviceTicket.findUnique.mockResolvedValue({ id: "ticket-1" });
      prisma.serviceTicket.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("ticket-1", { status: ServiceTicketStatus.IN_PROGRESS });

      expect(result.resolvedAt).toBeUndefined();
    });

    it("throws NotFoundException for a missing ticket", async () => {
      prisma.serviceTicket.findUnique.mockResolvedValue(null);
      await expect(service.update("missing", {})).rejects.toThrow(NotFoundException);
    });
  });
});
