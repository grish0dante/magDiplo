const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();

const hash = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) return reject(err);
      resolve(key.toString('hex'));
    });
  });

const safe = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (
      cleanName.length < 2 ||
      cleanName.length > 80 ||
      !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
      cleanEmail.length > 254 ||
      typeof password !== 'string' ||
      password.length < 10 ||
      password.length > 128
    ) {
      return res.status(400).json({
        error: 'Вкажіть ім’я, коректний email та пароль від 10 символів',
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      passwordHash: salt + ':' + (await hash(password, salt)),
    });

    res.status(201).json({ user: safe(user), token: sign(user) });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({
      error: e.code === 11000 ? 'Email вже зареєстровано' : 'Помилка реєстрації',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (typeof password !== 'string') {
      return res.status(401).json({ error: 'Неправильні облікові дані' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Неправильні облікові дані' });
    }

    const [salt, stored] = user.passwordHash.split(':');
    const actual = Buffer.from(await hash(password, salt), 'hex');
    const expected = Buffer.from(stored, 'hex');

    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      return res.status(401).json({ error: 'Неправильні облікові дані' });
    }

    res.json({ user: safe(user), token: sign(user) });
  } catch {
    res.status(500).json({ error: 'Помилка входу' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(401).json({ error: 'Обліковий запис не знайдено' });
  }

  res.json({ user: safe(user) });
});

module.exports = router;

