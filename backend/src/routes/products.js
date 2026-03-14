const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/products
router.get('/', async (req, res, next) => {
    try {
        const { search, categoryId, page = 1, limit = 50 } = req.query;
        const where = {};
        if (search) where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
        ];
        if (categoryId) where.categoryId = categoryId;

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: true,
                    stockLevels: { include: { location: { include: { warehouse: true } } } },
                },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                orderBy: { name: 'asc' },
            }),
            prisma.product.count({ where }),
        ]);

        // Enrich with total stock + low stock flag
        const enriched = products.map((p) => {
            const totalStock = p.stockLevels.reduce((sum, sl) => sum + sl.qty, 0);
            return { ...p, totalStock, isLowStock: totalStock > 0 && totalStock <= p.reorderQty, isOutOfStock: totalStock === 0 };
        });

        res.json({ data: enriched, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { category: true, stockLevels: { include: { location: { include: { warehouse: true } } } } },
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        const totalStock = product.stockLevels.reduce((sum, sl) => sum + sl.qty, 0);
        res.json({ ...product, totalStock, isLowStock: totalStock > 0 && totalStock <= product.reorderQty, isOutOfStock: totalStock === 0 });
    } catch (err) { next(err); }
});

// POST /api/products
router.post('/', async (req, res, next) => {
    try {
        const { name, sku, categoryId, unit, reorderQty, description, initialStock, locationId } = req.body;
        if (!name || !sku || !categoryId) return res.status(400).json({ error: 'Name, SKU, and category are required' });

        const product = await prisma.product.create({
            data: { name, sku, categoryId, unit: unit || 'pcs', reorderQty: parseInt(reorderQty) || 10, description },
            include: { category: true },
        });

        // Optional initial stock
        if (initialStock && locationId) {
            await prisma.stockLevel.create({ data: { productId: product.id, locationId, qty: parseInt(initialStock) } });
        }

        res.status(201).json(product);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
        next(err);
    }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
    try {
        const { name, sku, categoryId, unit, reorderQty, description } = req.body;
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: { name, sku, categoryId, unit, reorderQty: parseInt(reorderQty), description },
            include: { category: true, stockLevels: { include: { location: { include: { warehouse: true } } } } },
        });
        res.json(product);
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
        if (err.code === 'P2002') return res.status(409).json({ error: 'SKU already exists' });
        next(err);
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id } });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
        next(err);
    }
});

// GET /api/products/:id/stock
router.get('/:id/stock', async (req, res, next) => {
    try {
        const stockLevels = await prisma.stockLevel.findMany({
            where: { productId: req.params.id },
            include: { location: { include: { warehouse: true } } },
        });
        res.json(stockLevels);
    } catch (err) { next(err); }
});

module.exports = router;
