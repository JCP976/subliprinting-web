require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecreto123';

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for backend uploads
const supabase = createClient(supabaseUrl, supabaseKey);

// PostgreSQL Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase/Render
});

app.use(express.json());
app.use(cors());

// Log Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleString()} - ${req.method} ${req.url}`);
    next();
});

// ======================================================================
//                              MIDDLEWARES
// ======================================================================
const verifyToken = (req, res, next) => {
    const token = req.headers['x-access-token'];
    if (!token) return res.status(403).json({ error: "No se proveyó un token" });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Token inválido o expirado" });
        req.userId = decoded.id;
        req.userRole = decoded.rol;
        next();
    });
};

const isSuperAdmin = (req, res, next) => {
    if (req.userRole !== 'superadmin') return res.status(403).json({ error: "Requiere rol de superadmin" });
    next();
};

const hasRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userRole) && req.userRole !== 'superadmin') {
            return res.status(403).json({ error: `Requiere uno de estos roles: ${roles.join(', ')}` });
        }
        next();
    };
};

// Multer in-memory storage for Supabase upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ======================================================================
//                              API ROUTES (PRIORITY)
// ======================================================================

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'connected' }));

// --- NOTIFICACIONES ---
app.get('/api/notificaciones', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notificaciones WHERE para_rol = $1 OR para_rol = 'todos' ORDER BY id DESC LIMIT 10",
            [req.userRole]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notificaciones', verifyToken, hasRole(['superadmin', 'administrador']), async (req, res) => {
    const { mensaje, para_rol } = req.body;
    try {
        await pool.query(
            "INSERT INTO notificaciones (mensaje, para_rol) VALUES ($1, $2)",
            [mensaje, para_rol || 'todos']
        );
        res.json({ message: "Notificación enviada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        const user = result.rows[0];
        
        if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: "Credenciales inválidas" });

        const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: 86400 });
        res.json({ message: "Éxito", token, user: { id: user.id, nombre: user.nombre, rol: user.rol, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const validRoles = ['cliente', 'administrador', 'diseñador', 'producción', 'superadmin'];
        const roleToAssign = validRoles.includes(rol) ? rol : 'cliente';
        
        const result = await pool.query(
            "INSERT INTO usuarios (email, password, rol, nombre) VALUES ($1, $2, $3, $4) RETURNING id",
            [email, hash, roleToAssign, nombre]
        );
        res.json({ message: "Usuario registrado", id: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ error: "El email ya está registrado o datos inválidos" });
    }
});

// --- STATIC FILES (FALLBACK) ---
app.use(express.static(path.join(__dirname))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.put('/api/perfil', verifyToken, upload.single('foto_perfil'), async (req, res) => {
    const { nombre, password, telefono, fecha_nacimiento } = req.body;
    try {
        let updates = ['nombre = $1', 'telefono = $2', 'fecha_nacimiento = $3'];
        let params = [nombre, telefono || '', fecha_nacimiento || ''];
        let counter = 4;

        if (password) {
            updates.push(`password = $${counter++}`);
            params.push(await bcrypt.hash(password, 10));
        }
        
        if (req.file) {
            const fileName = `profile_${req.userId}_${Date.now()}${path.extname(req.file.originalname)}`;
            const { data, error } = await supabase.storage
                .from('usuarios')
                .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            
            if (error) throw error;
            
            const publicUrl = supabase.storage.from('usuarios').getPublicUrl(fileName).data.publicUrl;
            updates.push(`foto_perfil = $${counter++}`);
            params.push(publicUrl);
        }
        
        params.push(req.userId);
        const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${counter}`;
        await pool.query(sql, params);
        
        const result = await pool.query("SELECT id, email, rol, nombre, foto_perfil, telefono, fecha_nacimiento FROM usuarios WHERE id = $1", [req.userId]);
        res.json({ message: "Perfil actualizado", user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USUARIOS (Superadmin) ---
app.get('/api/usuarios', verifyToken, isSuperAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, email, rol, nombre FROM usuarios");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PEDIDOS ---
app.post('/api/pedidos', verifyToken, async (req, res) => {
    const { detalles, cliente_id_req } = req.body;
    const cliente_id = req.userRole === 'cliente' ? req.userId : (cliente_id_req || req.userId);
    try {
        const result = await pool.query(
            "INSERT INTO pedidos (cliente_id, detalles, estado) VALUES ($1, $2, 'pendiente') RETURNING id",
            [cliente_id, detalles]
        );
        const pedido_id = result.rows[0].id;
        await pool.query(
            "INSERT INTO historial_pedidos (pedido_id, usuario_id, estado_anterior, estado_nuevo) VALUES ($1, $2, $3, $4)",
            [pedido_id, req.userId, 'N/A', 'pendiente']
        );
        res.json({ message: "Pedido creado", id: pedido_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pedidos', verifyToken, async (req, res) => {
    try {
        let sql = `SELECT p.*, u.nombre as cliente_nombre, u.email as cliente_email FROM pedidos p JOIN usuarios u ON p.cliente_id = u.id `;
        let params = [];
        
        if (req.userRole === 'cliente') {
            sql += `WHERE p.cliente_id = $1 `;
            params.push(req.userId);
        } else if (req.userRole === 'diseñador') {
            sql += `WHERE p.estado IN ('pendiente', 'en diseño', 'aprobado') `;
        } else if (req.userRole === 'producción') {
            sql += `WHERE p.estado IN ('aprobado', 'en producción', 'terminado') `;
        }
        
        sql += `ORDER BY p.id DESC`;
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DISEÑOS ---
app.post('/api/disenos', verifyToken, hasRole(['diseñador', 'cliente']), upload.single('archivoDiseno'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
        const fileName = `diseno_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const { data, error } = await supabase.storage
            .from('disenos')
            .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        
        if (error) throw error;
        
        const publicUrl = supabase.storage.from('disenos').getPublicUrl(fileName).data.publicUrl;
        const pedido_id = req.body.pedido_id || 0; 
        
        const result = await pool.query(
            "INSERT INTO disenos (pedido_id, disenador_id, ruta_archivo, estado_aprobacion) VALUES ($1, $2, $3, 'pendiente') RETURNING id",
            [pedido_id, req.userId, publicUrl]
        );
        res.json({ message: "Diseño subido", id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCTOS CATALOGO ---
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/productos', verifyToken, hasRole(['administrador', 'superadmin']), upload.single('imagenProducto'), async (req, res) => {
    const { nombre, descripcion, categoria, precio, badge, fabric, features } = req.body;
    try {
        let imagenUrl = "https://placehold.co/500x500/1E293B/ffffff?text=Nuevo+Producto";
        
        if (req.file) {
            const fileName = `prod_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('productos')
                .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            
            if (error) throw error;
            imagenUrl = supabase.storage.from('productos').getPublicUrl(fileName).data.publicUrl;
        }
        
        let featuresArray = [descripcion];
        if (features) {
            featuresArray = features.split(',').map(f => f.trim()).filter(f => f);
        }
        
        const sql = `INSERT INTO productos (nombre, descripcion, categoria, precio, precio_texto, imagen, badge, fabric, features) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        await pool.query(sql, [nombre, descripcion, categoria, parseFloat(precio), `$${precio} MXN`, imagenUrl, badge || '', fabric || 'N/A', JSON.stringify(featuresArray)]);
        res.json({ message: "Producto añadido" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CHAT ---
app.get('/api/chat', verifyToken, hasRole(['administrador', 'superadmin', 'diseñador', 'producción']), async (req, res) => {
    const { destinatario_id } = req.query;
    try {
        let sql = `SELECT c.*, u.nombre, u.rol FROM chat c JOIN usuarios u ON c.usuario_id = u.id WHERE c.destinatario_id IS NULL ORDER BY c.id ASC LIMIT 100`;
        let params = [];
        if (destinatario_id && destinatario_id !== 'null') {
            sql = `SELECT c.*, u.nombre, u.rol FROM chat c JOIN usuarios u ON c.usuario_id = u.id WHERE (c.usuario_id = $1 AND c.destinatario_id = $2) OR (c.usuario_id = $3 AND c.destinatario_id = $4) ORDER BY c.id ASC LIMIT 100`;
            params = [req.userId, destinatario_id, destinatario_id, req.userId];
        }
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat', verifyToken, hasRole(['administrador', 'superadmin', 'diseñador', 'producción']), upload.single('archivo'), async (req, res) => {
    const { mensaje, destinatario_id } = req.body;
    try {
        let archivoUrl = null;
        if (req.file) {
            const fileName = `chat_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage
                .from('chat')
                .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
            if (error) throw error;
            archivoUrl = supabase.storage.from('chat').getPublicUrl(fileName).data.publicUrl;
        }
        
        const dest = destinatario_id === 'null' || !destinatario_id ? null : destinatario_id;
        await pool.query(
            "INSERT INTO chat (usuario_id, mensaje, archivo, destinatario_id) VALUES ($1, $2, $3, $4)",
            [req.userId, mensaje, archivoUrl, dest]
        );
        res.json({ message: "Mensaje enviado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

