const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Asegurar directorios
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Helpers de lectura
function getVehicles() {
    try {
        const p = path.join(dataDir, 'vehicles.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    } catch (e) { return []; }
}

function getReports() {
    try {
        const p = path.join(dataDir, 'reports.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    } catch (e) { return []; }
}

function saveReports(data) {
    fs.writeFileSync(path.join(dataDir, 'reports.json'), JSON.stringify(data, null, 2));
}

// --- ENDPOINTS ---

// 1. Consulta Placa (Búsqueda flexible + Override de Permiso)
app.post('/consultar-placa', upload.none(), (req, res) => {
    const { placa, serie, vin } = req.body;
    const val = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

    if (!val) return res.status(400).json({ error: true, message: 'Ingrese dato válido' });

    const vehicles = getVehicles();
    let found = vehicles.find(v => {
        const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
        const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
        const st = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
        return p === val || s === val || st === val;
    });

    if (found) {
        found.numero_permiso = "PL/23285/TRA/OM/2020"; // FORZADO ESTÁTICO
        return res.json({ error: false, data: [found] });
    }
    return res.status(200).json({ error: true, code: 404, message: 'No registrado' });
});

// 2. Reportes
app.post('/api/reportar', upload.array('reportImages[]', 3), (req, res) => {
    const { placa, descripcion, latitud, longitud, correo, telefono } = req.body;
    const reports = getReports();
    const newReport = {
        folio: `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        placa: placa.toUpperCase(),
        descripcion,
        latitud, longitud, correo, telefono,
        imagenes: req.files ? req.files.map(f => `/uploads/${f.filename}`) : [],
        fecha: new Date().toISOString()
    };
    reports.unshift(newReport);
    saveReports(reports);
    res.json({ success: true, folio: newReport.folio });
});

app.get('/api/reportes', (req, res) => res.json(getReports()));

// 3. Permiso (Hardcodeado para que sea siempre el mismo)
app.get('/api/permiso/:id', (req, res) => {
    res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente"
    });
});

// 4. SPA Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});
