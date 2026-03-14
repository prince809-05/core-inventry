const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET all adjustments
router.get('/', async (req, res, next) => {
    try {
        const { productId, page = 1, limit = 20 } = req.query;
        const where = {};
        if (productId) where.productId = productId;
        const [adjustments, total] = await Promise.all([
            prisma.adjustment.findMany({
                where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
                include: {
                    product: { include: { category: true } },
                    location: { include: { warehouse: true } },
                    user: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.adjustment.count({ where }),
        ]);
        res.json({ data: adjustments, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { next(err); }
});

// POST create adjustment (physical count → apply difference)
router.post('/', async (req, res, next) => {
    try {
        const { productId, locationId, physicalQty, reason } = req.body;
        if (!productId || !locationId || physicalQty === undefined || !reason)
            return res.status(400).json({ error: 'productId, locationId, physicalQty, reason are required' });

        const reference = 'ADJ-' + Date.now().toString().slice(-6);

        const result = await prisma.$transaction(async (tx) => {
            const sl = await tx.stockLevel.findUnique({
                where: { productId_locationId: { productId, locationId } },
            });
            const previousQty = sl ? sl.qty : 0;
            const difference = parseInt(physicalQty) - previousQty;

            // Apply adjustment
            if (sl) {
                await tx.stockLevel.update({
                    where: { productId_locationId: { productId, locationId } },
                    data: { qty: parseInt(physicalQty) },
                });
            } else {
                await tx.stockLevel.create({ data: { productId, locationId, qty: parseInt(physicalQty) } });
            }

            // Create adjustment record
            const adj = await tx.adjustment.create({
                data: { reference, productId, locationId, physicalQty: parseInt(physicalQty), previousQty, difference, reason, userId: req.user.id },
                include: { product: true, location: { include: { warehouse: true } } },
            });

            // Stock move log
            await tx.stockMove.create({
                data: {
                    type: 'ADJUSTMENT', reference,
                    productId, fromLocId: null, toLocId: locationId,
                    qtyChange: difference, qtyBefore: previousQty, qtyAfter: parseInt(physicalQty), userId: req.user.id,
                },
            });

            return adj;
        });

        res.status(201).json(result);
    } catch (err) { next(err); }
});

module.exports = router;
