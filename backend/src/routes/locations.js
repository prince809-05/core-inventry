const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST create location
router.post('/', async (req, res, next) => {
    try {
        const { warehouseId, name, code } = req.body;
        if (!warehouseId || !name || !code) return res.status(400).json({ error: 'warehouseId, name, and code required' });
        const loc = await prisma.location.create({
            data: { warehouseId, name, code: code.toUpperCase() },
            include: { warehouse: true },
        });
        res.status(201).json(loc);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Location code already exists in this warehouse' });
        next(err);
    }
});

// PUT update location
router.put('/:id', async (req, res, next) => {
    try {
        const { name, code } = req.body;
        const loc = await prisma.location.update({
            where: { id: req.params.id },
            data: { name, code: code?.toUpperCase() },
        });
        res.json(loc);
    } catch (err) { next(err); }
});

// DELETE location
router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.location.delete({ where: { id: req.params.id } });
        res.json({ message: 'Location deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
