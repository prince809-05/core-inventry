const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
        res.json(categories);
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });
        const category = await prisma.category.create({ data: { name } });
        res.status(201).json(category);
    } catch (err) {
        if (err.code === 'P2002') return res.status(409).json({ error: 'Category already exists' });
        next(err);
    }
});

router.put('/:id', async (req, res, next) => {
    try {
        const category = await prisma.category.update({ where: { id: req.params.id }, data: { name: req.body.name } });
        res.json(category);
    } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id } });
        res.json({ message: 'Category deleted' });
    } catch (err) { next(err); }
});

module.exports = router;
