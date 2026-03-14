const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.stockMove.deleteMany();
  await prisma.adjustment.deleteMany();
  await prisma.transferLine.deleteMany();
  await prisma.transfer.deleteMany();
  await prisma.deliveryLine.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.receiptLine.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.warehouse.deleteMany();

  // Users
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@coreinventory.com', passwordHash: adminHash, role: 'admin' },
  });

  const userHash = await bcrypt.hash('User@123', 10);
  const staffUser = await prisma.user.create({
    data: { name: 'Staff Member', email: 'staff@coreinventory.com', passwordHash: userHash, role: 'user' },
  });

  // Warehouses
  const mainWH = await prisma.warehouse.create({
    data: { name: 'Main Warehouse', code: 'WH-MAIN', address: '123 Industrial Ave, Business Park' },
  });
  const prodWH = await prisma.warehouse.create({
    data: { name: 'Production Floor', code: 'WH-PROD', address: '456 Factory Road, Business Park' },
  });

  // Locations
  const mainRackA = await prisma.location.create({ data: { warehouseId: mainWH.id, name: 'Rack A', code: 'RACK-A' } });
  const mainRackB = await prisma.location.create({ data: { warehouseId: mainWH.id, name: 'Rack B', code: 'RACK-B' } });
  const mainRackC = await prisma.location.create({ data: { warehouseId: mainWH.id, name: 'Rack C', code: 'RACK-C' } });
  const prodZone1 = await prisma.location.create({ data: { warehouseId: prodWH.id, name: 'Zone 1', code: 'ZONE-1' } });
  const prodZone2 = await prisma.location.create({ data: { warehouseId: prodWH.id, name: 'Zone 2', code: 'ZONE-2' } });

  // Categories
  const electronics = await prisma.category.create({ data: { name: 'Electronics' } });
  const hardware = await prisma.category.create({ data: { name: 'Hardware' } });
  const consumables = await prisma.category.create({ data: { name: 'Consumables' } });

  // Products
  const p1 = await prisma.product.create({ data: { name: 'Laptop 15" Pro', sku: 'EL-LAP-001', categoryId: electronics.id, unit: 'pcs', reorderQty: 5 } });
  const p2 = await prisma.product.create({ data: { name: 'Wireless Mouse', sku: 'EL-MOU-002', categoryId: electronics.id, unit: 'pcs', reorderQty: 10 } });
  const p3 = await prisma.product.create({ data: { name: 'USB-C Hub 7-in-1', sku: 'EL-HUB-003', categoryId: electronics.id, unit: 'pcs', reorderQty: 15 } });
  const p4 = await prisma.product.create({ data: { name: 'Monitor 27" 4K', sku: 'EL-MON-004', categoryId: electronics.id, unit: 'pcs', reorderQty: 3 } });
  const p5 = await prisma.product.create({ data: { name: 'M6 Bolt Set', sku: 'HW-BOL-001', categoryId: hardware.id, unit: 'box', reorderQty: 20 } });
  const p6 = await prisma.product.create({ data: { name: 'Steel Bracket 50mm', sku: 'HW-BRA-002', categoryId: hardware.id, unit: 'pcs', reorderQty: 30 } });
  const p7 = await prisma.product.create({ data: { name: 'Hex Wrench Set', sku: 'HW-WRE-003', categoryId: hardware.id, unit: 'set', reorderQty: 10 } });
  const p8 = await prisma.product.create({ data: { name: 'Thermal Paste 5g', sku: 'CO-THE-001', categoryId: consumables.id, unit: 'tube', reorderQty: 25 } });
  const p9 = await prisma.product.create({ data: { name: 'Cable Ties 100pc', sku: 'CO-CAB-002', categoryId: consumables.id, unit: 'pack', reorderQty: 20 } });
  const p10 = await prisma.product.create({ data: { name: 'Isopropyl Alcohol 500ml', sku: 'CO-ISO-003', categoryId: consumables.id, unit: 'bottle', reorderQty: 15 } });

  // Stock Levels (initial)
  const stockData = [
    { productId: p1.id, locationId: mainRackA.id, qty: 12 },
    { productId: p2.id, locationId: mainRackA.id, qty: 45 },
    { productId: p3.id, locationId: mainRackB.id, qty: 8 },
    { productId: p4.id, locationId: mainRackB.id, qty: 2 }, // Below reorder (3)
    { productId: p5.id, locationId: mainRackC.id, qty: 5 }, // Below reorder (20) - low stock
    { productId: p6.id, locationId: mainRackC.id, qty: 0 }, // Out of stock
    { productId: p7.id, locationId: mainRackC.id, qty: 18 },
    { productId: p8.id, locationId: prodZone1.id, qty: 3 }, // Low stock
    { productId: p9.id, locationId: prodZone1.id, qty: 34 },
    { productId: p10.id, locationId: prodZone2.id, qty: 22 },
    { productId: p1.id, locationId: prodZone2.id, qty: 4 },
    { productId: p2.id, locationId: prodZone1.id, qty: 0 }, // Out of stock
  ];

  for (const sl of stockData) {
    await prisma.stockLevel.create({ data: sl });
  }

  // Receipt 1 - DONE (adds laptops + mice)
  const rec1 = await prisma.receipt.create({
    data: {
      reference: 'REC-0001',
      supplier: 'TechSupply Co.',
      status: 'DONE',
      validatedAt: new Date('2026-03-01T10:00:00Z'),
      userId: admin.id,
      lines: {
        create: [
          { productId: p1.id, qty: 10, locationId: mainRackA.id },
          { productId: p2.id, qty: 30, locationId: mainRackA.id },
        ],
      },
    },
  });

  // Receipt 2 - WAITING
  const rec2 = await prisma.receipt.create({
    data: {
      reference: 'REC-0002',
      supplier: 'Hardware World',
      status: 'WAITING',
      userId: staffUser.id,
      lines: {
        create: [
          { productId: p5.id, qty: 50, locationId: mainRackC.id },
          { productId: p6.id, qty: 100, locationId: mainRackC.id },
        ],
      },
    },
  });

  // Receipt 3 - READY
  const rec3 = await prisma.receipt.create({
    data: {
      reference: 'REC-0003',
      supplier: 'Consumables Plus',
      status: 'READY',
      userId: admin.id,
      lines: {
        create: [
          { productId: p8.id, qty: 40, locationId: prodZone1.id },
          { productId: p10.id, qty: 25, locationId: prodZone2.id },
        ],
      },
    },
  });

  // Delivery 1 - DONE
  const del1 = await prisma.delivery.create({
    data: {
      reference: 'DEL-0001',
      customer: 'Acme Corp.',
      status: 'DONE',
      validatedAt: new Date('2026-03-05T14:00:00Z'),
      userId: admin.id,
      lines: {
        create: [
          { productId: p2.id, locationId: mainRackA.id, qty: 5 },
          { productId: p3.id, locationId: mainRackB.id, qty: 2 },
        ],
      },
    },
  });

  // Delivery 2 - READY
  const del2 = await prisma.delivery.create({
    data: {
      reference: 'DEL-0002',
      customer: 'Global Industries',
      status: 'READY',
      userId: staffUser.id,
      lines: {
        create: [
          { productId: p1.id, locationId: mainRackA.id, qty: 3 },
        ],
      },
    },
  });

  // Transfer 1 - DONE
  const tr1 = await prisma.transfer.create({
    data: {
      reference: 'TRF-0001',
      status: 'DONE',
      validatedAt: new Date('2026-03-08T09:00:00Z'),
      userId: admin.id,
      lines: {
        create: [
          { productId: p2.id, fromLocationId: mainRackA.id, toLocationId: prodZone1.id, qty: 10 },
          { productId: p9.id, fromLocationId: prodZone1.id, toLocationId: mainRackB.id, qty: 6 },
        ],
      },
    },
  });

  // Transfer 2 - DRAFT
  const tr2 = await prisma.transfer.create({
    data: {
      reference: 'TRF-0002',
      status: 'DRAFT',
      userId: staffUser.id,
      lines: {
        create: [
          { productId: p7.id, fromLocationId: mainRackC.id, toLocationId: prodZone1.id, qty: 5 },
        ],
      },
    },
  });

  // Stock Moves - historical ledger
  const moves = [
    // Receipt 1
    { type: 'RECEIPT', reference: 'REC-0001', productId: p1.id, fromLocId: null, toLocId: mainRackA.id, qtyChange: 10, qtyBefore: 2, qtyAfter: 12, userId: admin.id, createdAt: new Date('2026-03-01T10:00:00Z') },
    { type: 'RECEIPT', reference: 'REC-0001', productId: p2.id, fromLocId: null, toLocId: mainRackA.id, qtyChange: 30, qtyBefore: 15, qtyAfter: 45, userId: admin.id, createdAt: new Date('2026-03-01T10:00:00Z') },
    // Delivery 1
    { type: 'DELIVERY', reference: 'DEL-0001', productId: p2.id, fromLocId: mainRackA.id, toLocId: null, qtyChange: -5, qtyBefore: 50, qtyAfter: 45, userId: admin.id, createdAt: new Date('2026-03-05T14:00:00Z') },
    { type: 'DELIVERY', reference: 'DEL-0001', productId: p3.id, fromLocId: mainRackB.id, toLocId: null, qtyChange: -2, qtyBefore: 10, qtyAfter: 8, userId: admin.id, createdAt: new Date('2026-03-05T14:00:00Z') },
    // Transfer 1
    { type: 'TRANSFER', reference: 'TRF-0001', productId: p2.id, fromLocId: mainRackA.id, toLocId: prodZone1.id, qtyChange: -10, qtyBefore: 45, qtyAfter: 35, userId: admin.id, createdAt: new Date('2026-03-08T09:00:00Z') },
    { type: 'TRANSFER', reference: 'TRF-0001', productId: p9.id, fromLocId: prodZone1.id, toLocId: mainRackB.id, qtyChange: -6, qtyBefore: 40, qtyAfter: 34, userId: admin.id, createdAt: new Date('2026-03-08T09:00:00Z') },
  ];

  for (const m of moves) {
    await prisma.stockMove.create({ data: m });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Admin: admin@coreinventory.com / Admin@123');
  console.log('  Staff: staff@coreinventory.com / User@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
