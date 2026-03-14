const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function genRef() { return 'REC-' + Date.now().toString().slice(-6); }

// GET all receipts
router.get('/', async (req, res, next) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (search) where.OR = [
            { reference: { contains: search, mode: 'insensitive' } },
            { supplier: { contains: search, mode: 'insensitive' } },
        ];
        const [receipts, total] = await Promise.all([
            prisma.receipt.findMany({
                where, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit),
                include: { user: { select: { name: true } }, lines: { include: { product: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.receipt.count({ where }),
        ]);
        res.json({ data: receipts, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { next(err); }
});

// GET single receipt
router.get('/:id', async (req, res, next) => {
    try {
        const receipt = await prisma.receipt.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true } },
                lines: { include: { product: { include: { category: true } } } },
            },
        });
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        res.json(receipt);
    } catch (err) { next(err); }
});

// POST create receipt
router.post('/', async (req, res, next) => {
    try {
        const { supplier, notes, lines } = req.body;
        if (!supplier) return res.status(400).json({ error: 'Supplier required' });
        if (!lines || lines.length === 0) return res.status(400).json({ error: 'At least one line required' });

        const receipt = await prisma.receipt.create({
            data: {
                reference: genRef(),
                supplier,
                notes,
                status: 'DRAFT',
                userId: req.user.id,
                lines: {
                    create: lines.map((l) => ({
                        productId: l.productId,
                        qty: parseInt(l.qty),
                        locationId: l.locationId || null,
                    })),
                },
            },
            include: { lines: { include: { product: true } } },
        });
        res.status(201).json(receipt);
    } catch (err) { next(err); }
});

// PUT update receipt
router.put('/:id', async (req, res, next) => {
    try {
        const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        if (receipt.status === 'DONE' || receipt.status === 'CANCELED')
            return res.status(400).json({ error: 'Cannot edit a done or canceled receipt' });

        const { supplier, notes, status, lines } = req.body;

        // Update in transaction
        const updated = await prisma.$transaction(async (tx) => {
            if (lines) {
                await tx.receiptLine.deleteMany({ where: { receiptId: req.params.id } });
                await tx.receiptLine.createMany({
                    data: lines.map((l) => ({ receiptId: req.params.id, productId: l.productId, qty: parseInt(l.qty), locationId: l.locationId || null })),
                });
            }
            return tx.receipt.update({
                where: { id: req.params.id },
                data: { supplier, notes, status },
                include: { lines: { include: { product: true } } },
            });
        });
        res.json(updated);
    } catch (err) { next(err); }
});

// POST validate receipt → stock increase
router.post('/:id/validate', async (req, res, next) => {
    try {
        const receipt = await prisma.receipt.findUnique({
            where: { id: req.params.id },
            include: { lines: true },
        });
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        if (receipt.status === 'DONE') return res.status(400).json({ error: 'Already validated' });
        if (receipt.status === 'CANCELED') return res.status(400).json({ error: 'Cannot validate a canceled receipt' });

        await prisma.$transaction(async (tx) => {
            for (const line of receipt.lines) {
                if (!line.locationId) throw new Error(`Line for product ${line.productId} missing location`);

                const existing = await tx.stockLevel.findUnique({
                    where: { productId_locationId: { productId: line.productId, locationId: line.locationId } },
                });
                const qtyBefore = existing ? existing.qty : 0;
                const qtyAfter = qtyBefore + line.qty;

                if (existing) {
                    await tx.stockLevel.update({
                        where: { productId_locationId: { productId: line.productId, locationId: line.locationId } },
                        data: { qty: qtyAfter },
                    });
                } else {
                    await tx.stockLevel.create({ data: { productId: line.productId, locationId: line.locationId, qty: qtyAfter } });
                }

                await tx.stockMove.create({
                    data: {
                        type: 'RECEIPT', reference: receipt.reference,
                        productId: line.productId, fromLocId: null, toLocId: line.locationId,
                        qtyChange: line.qty, qtyBefore, qtyAfter, userId: req.user.id,
                    },
                });
            }
            await tx.receipt.update({ where: { id: req.params.id }, data: { status: 'DONE', validatedAt: new Date() } });
        });

        const updated = await prisma.receipt.findUnique({
            where: { id: req.params.id },
            include: { lines: { include: { product: true } } },
        });
        res.json(updated);
    } catch (err) { next(err); }
});

// POST cancel receipt
router.post('/:id/cancel', async (req, res, next) => {
    try {
        const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
        if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
        if (receipt.status === 'DONE') return res.status(400).json({ error: 'Cannot cancel a validated receipt' });
        const updated = await prisma.receipt.update({ where: { id: req.params.id }, data: { status: 'CANCELED' } });
        res.json(updated);
    } catch (err) { next(err); }
});

module.exports = router;
