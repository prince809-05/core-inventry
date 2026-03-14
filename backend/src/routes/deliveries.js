const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genRef() { return 'DEL-' + Date.now().toString().slice(-6); }

// GET all deliveries
router.get('/', async (req, res, next) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (search) where.OR = [
            { reference: { contains: search, mode: 'insensitive' } },
            { customer: { contains: search, mode: 'insensitive' } },
        ];
        const [deliveries, total] = await Promise.all([
            prisma.delivery.findMany({
                where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
                include: { user: { select: { name: true } }, lines: { include: { product: true, location: { include: { warehouse: true } } } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.delivery.count({ where }),
        ]);
        res.json({ data: deliveries, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { next(err); }
});

// GET single delivery
router.get('/:id', async (req, res, next) => {
    try {
        const delivery = await prisma.delivery.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true } },
                lines: { include: { product: { include: { category: true } }, location: { include: { warehouse: true } } } },
            },
        });
        if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
        res.json(delivery);
    } catch (err) { next(err); }
});

// POST create delivery
router.post('/', async (req, res, next) => {
    try {
        const { customer, notes, lines } = req.body;
        if (!customer) return res.status(400).json({ error: 'Customer required' });
        if (!lines || lines.length === 0) return res.status(400).json({ error: 'At least one line required' });

        const delivery = await prisma.delivery.create({
            data: {
                reference: genRef(),
                customer, notes, status: 'DRAFT', userId: req.user.id,
                lines: {
                    create: lines.map((l) => ({
                        productId: l.productId, locationId: l.locationId, qty: parseInt(l.qty),
                    })),
                },
            },
            include: { lines: { include: { product: true, location: true } } },
        });
        res.status(201).json(delivery);
    } catch (err) { next(err); }
});

// PUT update delivery
router.put('/:id', async (req, res, next) => {
    try {
        const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
        if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
        if (delivery.status === 'DONE' || delivery.status === 'CANCELED')
            return res.status(400).json({ error: 'Cannot edit a done or canceled delivery' });

        const { customer, notes, status, lines } = req.body;
        const updated = await prisma.$transaction(async (tx) => {
            if (lines) {
                await tx.deliveryLine.deleteMany({ where: { deliveryId: req.params.id } });
                await tx.deliveryLine.createMany({
                    data: lines.map((l) => ({ deliveryId: req.params.id, productId: l.productId, locationId: l.locationId, qty: parseInt(l.qty) })),
                });
            }
            return tx.delivery.update({
                where: { id: req.params.id }, data: { customer, notes, status },
                include: { lines: { include: { product: true, location: true } } },
            });
        });
        res.json(updated);
    } catch (err) { next(err); }
});

// POST validate delivery → stock decrease
router.post('/:id/validate', async (req, res, next) => {
    try {
        const delivery = await prisma.delivery.findUnique({
            where: { id: req.params.id }, include: { lines: true },
        });
        if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
        if (delivery.status === 'DONE') return res.status(400).json({ error: 'Already validated' });
        if (delivery.status === 'CANCELED') return res.status(400).json({ error: 'Cannot validate a canceled delivery' });

        await prisma.$transaction(async (tx) => {
            for (const line of delivery.lines) {
                const sl = await tx.stockLevel.findUnique({
                    where: { productId_locationId: { productId: line.productId, locationId: line.locationId } },
                });
                if (!sl || sl.qty < line.qty)
                    throw Object.assign(new Error(`Insufficient stock for product at location`), { status: 400 });

                const qtyBefore = sl.qty;
                const qtyAfter = qtyBefore - line.qty;
                await tx.stockLevel.update({
                    where: { productId_locationId: { productId: line.productId, locationId: line.locationId } },
                    data: { qty: qtyAfter },
                });
                await tx.stockMove.create({
                    data: {
                        type: 'DELIVERY', reference: delivery.reference,
                        productId: line.productId, fromLocId: line.locationId, toLocId: null,
                        qtyChange: -line.qty, qtyBefore, qtyAfter, userId: req.user.id,
                    },
                });
            }
            await tx.delivery.update({ where: { id: req.params.id }, data: { status: 'DONE', validatedAt: new Date() } });
        });

        const updated = await prisma.delivery.findUnique({
            where: { id: req.params.id },
            include: { lines: { include: { product: true, location: true } } },
        });
        res.json(updated);
    } catch (err) { next(err); }
});

// POST cancel
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
        if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
        if (delivery.status === 'DONE') return res.status(400).json({ error: 'Cannot cancel a validated delivery' });
        const updated = await prisma.delivery.update({ where: { id: req.params.id }, data: { status: 'CANCELED' } });
        res.json(updated);
    } catch (err) { next(err); }
});

module.exports = router;
