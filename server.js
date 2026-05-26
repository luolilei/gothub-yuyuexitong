const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 4173);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_PATH = path.join(DATA_DIR, 'app.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    address TEXT NOT NULL,
    note TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function sendJson(res, status, data) {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON 格式错误'));
      }
    });
    req.on('error', reject);
  });
}

function createToken() {
  return crypto.randomBytes(24).toString('hex');
}

function requireUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return db.prepare('SELECT id, phone, name, address, created_at FROM users WHERE token = ?').get(token);
}

function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token === ADMIN_TOKEN;
}

function validateRequired(data, fields) {
  const missing = fields.filter(field => !String(data[field] || '').trim());
  return missing.length ? `${missing.join(', ')} 不能为空` : '';
}

async function handleApi(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/login') {
    const body = await readBody(req);
    const error = validateRequired(body, ['phone', 'name']);
    if (error) return sendJson(res, 400, { message: error });

    const phone = String(body.phone).trim();
    const name = String(body.name).trim();
    const address = String(body.address || '').trim();
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    if (user) {
      db.prepare('UPDATE users SET name = ?, address = COALESCE(NULLIF(?, ""), address) WHERE id = ?')
        .run(name, address, user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    } else {
      const token = createToken();
      const result = db.prepare('INSERT INTO users (phone, name, address, token) VALUES (?, ?, ?, ?)')
        .run(phone, name, address, token);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }

    return sendJson(res, 200, {
      token: user.token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        address: user.address
      }
    });
  }

  if (req.method === 'POST' && pathname === '/api/appointments') {
    const user = requireUser(req);
    if (!user) return sendJson(res, 401, { message: '请先登录' });

    const body = await readBody(req);
    const error = validateRequired(body, ['service', 'bookingDate', 'bookingTime', 'address']);
    if (error) return sendJson(res, 400, { message: error });

    const result = db.prepare(`
      INSERT INTO appointments (user_id, service, booking_date, booking_time, address, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      String(body.service).trim(),
      String(body.bookingDate).trim(),
      String(body.bookingTime).trim(),
      String(body.address).trim(),
      String(body.note || '').trim()
    );

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);
    return sendJson(res, 201, { appointment });
  }

  if (req.method === 'GET' && pathname === '/api/my-appointments') {
    const user = requireUser(req);
    if (!user) return sendJson(res, 401, { message: '请先登录' });

    const rows = db.prepare(`
      SELECT id, service, booking_date, booking_time, address, note, status, created_at
      FROM appointments
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(user.id);
    return sendJson(res, 200, { appointments: rows });
  }

  if (req.method === 'GET' && pathname === '/api/admin/appointments') {
    if (!requireAdmin(req)) return sendJson(res, 401, { message: '管理员认证失败' });

    const rows = db.prepare(`
      SELECT
        a.id,
        a.service,
        a.booking_date,
        a.booking_time,
        a.address,
        a.note,
        a.status,
        a.created_at,
        u.name AS user_name,
        u.phone AS user_phone
      FROM appointments a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
    `).all();
    return sendJson(res, 200, { appointments: rows });
  }

  if (req.method === 'POST' && pathname === '/api/admin/appointments/status') {
    if (!requireAdmin(req)) return sendJson(res, 401, { message: '管理员认证失败' });

    const body = await readBody(req);
    const id = Number(body.id);
    const status = String(body.status || '').trim();
    const allowed = new Set(['pending', 'confirmed', 'completed', 'cancelled']);
    if (!id || !allowed.has(status)) {
      return sendJson(res, 400, { message: '预约编号或状态不正确' });
    }

    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { message: '接口不存在' });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === '/' ? '/admin.html' : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { message: error.message || '服务器错误' });
  }
});

server.listen(PORT, () => {
  console.log(`Beauty booking server running at http://localhost:${PORT}`);
  console.log(`Admin token: ${ADMIN_TOKEN}`);
});
