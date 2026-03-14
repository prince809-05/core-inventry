const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genRef() { return 'TRF-' + Date.now().toString().slice(-6); }

// GET all transfers
router.get('/', async (req, res, next) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (search) where.reference = { contains: search, mode: 'insensitive' };
        const [transfers, total] = await Promise.all([
            prisma.transfer.findMany({
                where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
                include: {
                    user: { select: { name: true } },
                    lines: { include: { product: true, fromLocation: { include: { warehouse: true } }, toLocation: { include: { warehouse: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.transfer.count({ where }),
        ]);
        res.json({ data: transfers, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { next(err); }
});

// GET single transfer
router.get('/:id', async (req, res, next) => {
    try {
        const transfer = await prisma.transfer.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true } },
                lines: { include: { product: { include: { category: true } }, fromLocation: { include: { warehouse: true } }, toLocation: { include: { warehouse: true } } } },
            },
        });
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
        res.json(transfer);
    } catch (err) { next(err); }
});

// POST create transfer
router.post('/', async (req, res, next) => {
    try {
        const { notes, lines } = req.body;
        if (!lines || lines.length === 0) return res.status(400).json({ error: 'At least one line required' });

        const transfer = await prisma.transfer.create({
            data: {
                reference: genRef(), notes, status: 'DRAFT', userId: req.user.id,
                lines: {
                    create: lines.map((l) => ({
                        productId: l.productId,
                        fromLocationId: l.fromLocationId,
                        toLocationId: l.toLocationId,
                        qty: parseInt(l.qty),
                    })),
                },
            },
            include: { lines: { include: { product: true, fromLocation: true, toLocation: true } } },
        });
        res.status(201).json(transfer);
    } catch (err) { next(err); }
});

// PUT update transfer
router.put('/:id', async (req, res, next) => {
    try {
        const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id } });
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
        if (transfer.status === 'DONE' || transfer.status === 'CANCELED')
            return res.status(400).json({ error: 'Cannot edit' });

        const { notes, status, lines } = req.body;
        const updated = await prisma.$transaction(async (tx) => {
            if (lines) {
                await tx.transferLine.deleteMany({ where: { transferId: req.params.id } });
                await tx.transferLine.createMany({
                    data: lines.map((l) => ({ transferId: req.params.id, productId: l.productId, fromLocationId: l.fromLocationId, toLocationId: l.toLocationId, qty: parseInt(l.qty) })),
                });
            }
            return tx.transfer.update({ where: { id: req.params.id }, data: { notes, status } });
        });
        res.json(updated);
    } catch (err) { next(err); }
});

// POST validate transfer → move stock
router.post('/:id/validate', async (req, res, next) => {
    try {
        const transfer = await prisma.transfer.findUnique({
            where: { id: req.params.id }, include: { lines: true },
        });
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
        if (transfer.status === 'DONE') return res.status(400).json({ error: 'Already validated' });
        if (transfer.status === 'CANCELED') return res.status(400).json({ error: 'Cannot validate canceled transfer' });

        await prisma.$transaction(async (tx) => {
            for (const line of transfer.lines) {
                // Decrease from source
                const fromSL = await tx.stockLevel.findUnique({
                    where: { productId_locationId: { productId: line.productId, locationId: line.fromLocationId } },
                });
                if (!fromSL || fromSL.qty < line.qty)
                    throw Object.assign(new Error('Insufficient stock at source location'), { status: 400 });

                const fromBefore = fromSL.qty;
                const fromAfter = fromBefore - line.qty;
                await tx.stockLevel.update({
                    where: { productId_locationId: { productId: line.productId, locationId: line.fromLocationId } },
                    data: { qty: fromAfter },
                });

                // Increase at destination
                const toSL = await tx.stockLevel.findUnique({
                    where: { productId_locationId: { productId: line.productId, locationId: line.toLocationId } },
                });
                const toBefore = toSL ? toSL.qty : 0;
                const toAfter = toBefore + line.qty;
                if (toSL) {
                    await tx.stockLevel.update({
                        where: { productId_locationId: { productId: line.productId, locationId: line.toLocationId } },
                        data: { qty: toAfter },
                    });
                } else {
                    await tx.stockLevel.create({ data: { productId: line.productId, locationId: line.toLocationId, qty: toAfter } });
                }

                // Stock move log
                await tx.stockMove.create({
                    data: {
                        type: 'TRANSFER', reference: transfer.reference,
                        productId: line.productId, fromLocId: line.fromLocationId, toLocId: line.toLocationId,
                        qtyChange: line.qty, qtyBefore: fromBefore, qtyAfter: fromAfter, userId: req.user.id,
                    },
                });
            }
            await tx.transfer.update({ where: { id: req.params.id }, data: { status: 'DONE', validatedAt: new Date() } });
        });

        const updated = await prisma.transfer.findUnique({
            where: { id: req.params.id },
            include: { lines: { include: { product: true, fromLocation: { include: { warehouse: true } }, toLocation: { include: { warehouse: true } } } } },
        });
        res.json(updated);
    } catch (err) { next(err); }
});

// POST cancel
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id } });
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
        if (transfer.status === 'DONE') return res.status(400).json({ error: 'Cannot cancel a validated transfer' });
        const updated = await prisma.transfer.update({ where: { id: req.params.id }, data: { status: 'CANCELED' } });
        res.json(updated);
    } catch (err) { next(err); }
});

module.exports = router;
