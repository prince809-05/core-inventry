const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET stock moves with filters
router.get('/', async (req, res, next) => {
    try {
        const { productId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
        const where = {};
        if (productId) where.productId = productId;
        if (type) where.type = type;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59Z');
        }

        const [moves, total] = await Promise.all([
            prisma.stockMove.findMany({
                where,
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                include: {
                    product: { select: { name: true, sku: true } },
                    fromLoc: { include: { warehouse: { select: { name: true } } } },
                    toLoc: { include: { warehouse: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.stockMove.count({ where }),
        ]);
        res.json({ data: moves, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { next(err); }
});

module.exports = router;
