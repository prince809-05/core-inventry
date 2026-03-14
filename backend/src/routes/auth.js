const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const prisma = require('../prismaClient');

const router = express.Router();

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Name, email, and password are required' });
        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(409).json({ error: 'Email already in use' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({ data: { name, email, passwordHash } });
        const token = generateToken(user);
        res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken(user);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) { next(err); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // User requested clear feedback rather than generic security response
            return res.status(404).json({ error: 'No account found with this email address' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES || '10')) * 60 * 1000);
        await prisma.otpToken.create({ data: { userId: user.id, token: otp, expiresAt } });

        // Send email (best-effort)
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to: email,
                subject: 'CoreInventory - Password Reset OTP',
                html: `<p>Your OTP is: <strong>${otp}</strong></p><p>Expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p>`,
            });
            console.log(`[AUTH] OTP sent to ${email} successfully.`);
        } catch (mailErr) {
            console.error('[AUTH] Email send error:', mailErr.message);
            // Fallback for development without SMTP setup: print the OTP to the console so the user can still test it
            console.log(`\n================================`);
            console.log(`[DEV OTP FALLBACK] Email failed.`);
            console.log(`Your OTP for ${email} is: ${otp}`);
            console.log(`================================\n`);
        }

        res.json({ message: 'If this email exists, an OTP has been sent' });
    } catch (err) { next(err); }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid OTP' });

        const tokenRecord = await prisma.otpToken.findFirst({
            where: { userId: user.id, token: otp, used: false, expiresAt: { gte: new Date() } },
            orderBy: { createdAt: 'desc' },
        });
        if (!tokenRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

        // Mark used
        await prisma.otpToken.update({ where: { id: tokenRecord.id }, data: { used: true } });
        // Issue a short-lived reset token (different from auth token)
        const resetToken = jwt.sign(
            { userId: user.id, purpose: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // We MUST return the resetToken to the frontend so it can be passed to the next step
        res.json({ message: 'OTP verified', resetToken });
    } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ error: 'Reset token and new password required' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Invalid token' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: decoded.userId }, data: { passwordHash } });
        res.json({ message: 'Password reset successful' });
    } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// PUT /api/auth/profile
router.put('/profile', async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { name } = req.body;
        const user = await prisma.user.update({
            where: { id: decoded.id },
            data: { name },
            select: { id: true, name: true, email: true, role: true },
        });
        res.json(user);
    } catch (err) { next(err); }
});

module.exports = router;
