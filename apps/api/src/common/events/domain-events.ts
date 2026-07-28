export const DomainEvents = {
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  ORDER_CREATED: "order.created",
  SERVICE_TICKET_CREATED: "service_ticket.created",
} as const;

export interface ProductCreatedEvent {
  productId: string;
}

export interface ProductUpdatedEvent {
  productId: string;
}

export interface OrderCreatedEvent {
  salesOrderId: string;
}

export interface ServiceTicketCreatedEvent {
  serviceTicketId: string;
}
