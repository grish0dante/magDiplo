const crypto = require('crypto');
const SECRET = process.env.AUTH_SECRET;

if (!SECRET || SECRET.length < 32) {
  console.warn('AUTH_SECRET must be configured (32+ chars) for authentication');
}

const encode = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function sign(user) {
  if (!SECRET || SECRET.length < 32) {
    throw Error('Authentication is not configured: set AUTH_SECRET');
  }

  const payload = encode({
    sub: String(user._id),
    exp: Math.floor(Date.now() / 1000) + 7 * 86400,
  });

  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');

  return payload + '.' + sig;
}

function read(req) {
  const token = (req.headers.authorization || '').match(/^Bearer (.+)$/)?.[1];

  if (!token || !SECRET || SECRET.length < 32) return null;

  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;

  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest();
  let actual;

  try {
    actual = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url'));
    if (data.exp <= Date.now() / 1000 || !/^[a-f0-9]{24}$/.test(data.sub)) {
      return null;
    }
    return data.sub;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  req.userId = read(req);

  if (!req.userId) {
    return res.status(401).json({ error: 'Увійдіть до облікового запису' });
  }

  next();
}

module.exports = { sign, read, requireAuth };

