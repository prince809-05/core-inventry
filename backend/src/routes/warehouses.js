const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET all warehouses with locations
router.get('/', async (req, res, next) => {
    try {
        const warehouses = await prisma.warehouse.findMany({
            include: { locations: true },
            orderBy: { name: 'asc' },
        });
        res.json(warehouses);
    } catch (err) { next(err); }
});

// GET single warehouse
router.get('/:id', async (req, res, next) => {
    try {
        const wh = await prisma.warehouse.findUnique({
            where: { id: req.params.id },
            include: { locations: { include: { stockLevels: { include: { product: true } } } } },
        });
        if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
        res.json(wh);
    } catch (err) { next(err); }
});

// POST create warehouse
router.post('/', async (req, res, next) => {
    try {
        const { name, code, address } = req.body;
        if (!name || !code) return res.status(400).json({ error: 'Name and code required' });
        const wh = await prisma.warehouse.create({ data: { name, code: code.toUpperCase(), address } });
        res.status(201).json(wh);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Warehouse code already exists' });
        next(err);
    }
});

// PUT update warehouse
router.put('/:id', async (req, res, next) => {
    try {
        const { name, code, address } = req.body;
        const wh = await prisma.warehouse.update({
            where: { id: req.params.id },
            data: { name, code: code?.toUpperCase(), address },
        });
        res.json(wh);
    } catch (err) { next(err); }
});

// DELETE warehouse
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.warehouse.delete({ where: { id: req.params.id } });
        res.json({ message: 'Warehouse deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
