import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// Only two account types exist: Admin (fixed, full access) and Supervisor, whose actual
// access is a per-account permission set an Admin composes at creation time (see
// User.permissions), not a shared role-level list. "System" is internal-only, for the
// WhatsApp bot's authored records.
const ROLES = [
  { name: "Admin", permissions: ["*"] },
  { name: "Supervisor", permissions: [] },
  { name: "System", permissions: [] },
];

const RETIRED_ROLE_NAMES = ["Sales Executive", "Inventory Manager", "Service Technician"];

const CATEGORY_TREE: Record<string, string[]> = {
  "Cooking & Ventilation": [
    "Designer Chimneys",
    "Premium Built-in Hobs",
    "Built-in Microwave Ovens",
    "Convection Ovens",
  ],
  "Refrigeration & Cooling": [
    "Luxury Refrigerators",
    "Built-in Refrigerators",
    "Built-in Cooling Systems",
    "Beverage Cabinets",
  ],
  "Laundry & Utility": [
    "Built-in Dishwashers",
    "Washing Machines",
    "Dryers & Laundry Systems",
  ],
  "Water & Comfort": [
    "Quartz Composite Sinks",
    "Designer Faucets",
    "Water Purifiers (Alkaline)",
    "Water Heaters & Geysers",
  ],
};

const BRANDS = [
  "Faber",
  "Electrolux",
  "Siemens",
  "Bosch",
  "KAFF",
  "Häfele",
  "Hindware",
  "Carysil",
  "AO Smith",
  "ZeroB",
  "Racold",
  "Daikin",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const branch = await prisma.branch.upsert({
    where: { id: "malleswaram-showroom" },
    update: {},
    create: {
      id: "malleswaram-showroom",
      name: "DreamHome Malleswaram Showroom",
      address:
        "# 301/1, B/W 16th & 17th Cross, Sampige Road, Opp. Bangalore Cafe, Malleswaram",
      city: "Bengaluru",
      phone: "+91 98450 59388",
    },
  });

  const roles = new Map<string, string>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
    roles.set(role.name, created.id);
  }

  // Remove roles from the old fixed-role model, but only if nothing still references them.
  const retired = await prisma.role.deleteMany({
    where: { name: { in: RETIRED_ROLE_NAMES }, users: { none: {} } },
  });
  if (retired.count > 0) {
    console.log(`  Retired ${retired.count} unused legacy role(s): ${RETIRED_ROLE_NAMES.join(", ")}`);
  }

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: "admin@gmail.com",
      passwordHash: adminPasswordHash,
      name: "DreamHome Admin",
      roleId: roles.get("Admin")!,
      branchId: branch.id,
    },
  });

  // Attributed as the author of Interaction records the WhatsApp bot creates automatically.
  // Never used to log in — the random password hash is intentionally unusable.
  const botPasswordHash = await bcrypt.hash(randomUUID(), 10);
  await prisma.user.upsert({
    where: { email: "whatsapp-bot@dreamhome.local" },
    update: {},
    create: {
      email: "whatsapp-bot@dreamhome.local",
      passwordHash: botPasswordHash,
      name: "DreamHome WhatsApp Bot",
      isActive: false,
      roleId: roles.get("System")!,
      branchId: branch.id,
    },
  });

  for (const [parentName, children] of Object.entries(CATEGORY_TREE)) {
    const parent = await prisma.category.upsert({
      where: { slug: slugify(parentName) },
      update: {},
      create: { name: parentName, slug: slugify(parentName) },
    });

    for (const childName of children) {
      await prisma.category.upsert({
        where: { slug: slugify(childName) },
        update: { parentId: parent.id },
        create: { name: childName, slug: slugify(childName), parentId: parent.id },
      });
    }
  }

  for (const brandName of BRANDS) {
    await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });
  }

  console.log("Seed complete:");
  console.log(`  Branch: ${branch.name}`);
  console.log(`  Roles: ${ROLES.map((r) => r.name).join(", ")}`);
  console.log(`  Categories: ${Object.keys(CATEGORY_TREE).length} pillars`);
  console.log(`  Brands: ${BRANDS.length}`);
  console.log("  Admin login: admin@gmail.com / admin123");
  console.log("  System bot user: whatsapp-bot@dreamhome.local (inactive, never logs in)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
