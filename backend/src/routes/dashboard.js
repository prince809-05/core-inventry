const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard - aggregated KPIs
router.get('/', async (req, res, next) => {
    try {
        const [
            totalProducts,
            stockLevels,
            pendingReceipts,
            pendingDeliveries,
            scheduledTransfers,
            recentMoves,
        ] = await Promise.all([
            prisma.product.count(),
            prisma.stockLevel.findMany({ include: { product: { select: { reorderQty: true } } } }),
            prisma.receipt.count({ where: { status: { in: ['DRAFT', 'WAITING', 'READY'] } } }),
            prisma.delivery.count({ where: { status: { in: ['DRAFT', 'READY'] } } }),
            prisma.transfer.count({ where: { status: { in: ['DRAFT', 'READY'] } } }),
            prisma.stockMove.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { product: { select: { name: true, sku: true } }, fromLoc: { include: { warehouse: { select: { name: true } } } }, toLoc: { include: { warehouse: { select: { name: true } } } } },
            }),
        ]);

        // Aggregate stock by product to compute low/out
        const productStockMap = {};
        for (const sl of stockLevels) {
            if (!productStockMap[sl.productId]) {
                productStockMap[sl.productId] = { total: 0, reorderQty: sl.product.reorderQty };
            }
            productStockMap[sl.productId].total += sl.qty;
        }

        let lowStockCount = 0;
        let outOfStockCount = 0;
        for (const { total, reorderQty } of Object.values(productStockMap)) {
            if (total === 0) outOfStockCount++;
            else if (total <= reorderQty) lowStockCount++;
        }

        res.json({
            kpis: {
                totalProducts,
                lowStockCount,
                outOfStockCount,
                pendingReceipts,
                pendingDeliveries,
                scheduledTransfers,
            },
            recentMoves,
        });
    } catch (err) { next(err); }
});

module.exports = router;
