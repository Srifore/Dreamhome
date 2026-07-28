/**
 * Auto-vivifying Prisma mock: any `prismaMock.<model>.<method>` or top-level
 * `prismaMock.$transaction` access returns a jest.fn() the first time it's touched, so specs
 * don't need to hand-declare every model/method they happen to call.
 */
export type PrismaMock = Record<string, any>;

function autoMockLayer(): PrismaMock {
  const store: Record<string | symbol, jest.Mock> = {};
  return new Proxy(store, {
    get: (target, prop) => {
      // Jest's deep-equality/inspect machinery probes well-known symbols (Symbol.iterator,
      // util.inspect.custom, ...) when a mock object shows up inside toHaveBeenCalledWith — let
      // those fall through untouched instead of trying to auto-mock them.
      if (typeof prop === "symbol") return (target as any)[prop];
      if (!(prop in target)) {
        target[prop] = jest.fn();
      }
      return target[prop];
    },
  });
}

export function createPrismaMock(): PrismaMock {
  const store: Record<string | symbol, PrismaMock | jest.Mock> = {};
  return new Proxy(store, {
    get: (target, prop) => {
      if (typeof prop === "symbol") return (target as any)[prop];
      if (!(prop in target)) {
        // Prisma client top-level methods ($transaction, $connect, $queryRaw, ...) are callable
        // directly — everything else is a model with its own nested method map (findUnique, etc).
        target[prop] = prop.startsWith("$") ? jest.fn() : autoMockLayer();
      }
      return target[prop];
    },
  });
}
