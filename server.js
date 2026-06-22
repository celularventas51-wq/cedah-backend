const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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
const upload = multer({ storage: storage });

// Helper de datos
const dataDir = path.join(__dirname, 'data');
const vehiclesFilePath = path.join(dataDir, 'vehicles.json');

function getVehicles() {
    try {
        return fs.existsSync(vehiclesFilePath) ? JSON.parse(fs.readFileSync(vehiclesFilePath, 'utf8')) : [];
    } catch (e) { return []; }
}

// 1. Endpoint Consulta (Normaliza y fuerza permiso)
app.post('/consultar-placa', upload.none(), (req, res) => {
    const { placa, serie, vin } = req.body;
    const val = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

    if (!val) return res.status(400).json({ error: true, message: 'Ingrese datos' });

    const vehicles = getVehicles();
    let found = vehicles.find(v => {
        const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
        const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
        const st = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
        return p === val || s === val || st === val;
    });

    if (found) {
        found.numero_permiso = "PL/23285/TRA/OM/2020";
        return res.json({ error: false, data: [found] });
    }
    return res.status(200).json({ error: true, message: 'No registrado' });
});

// 2. Endpoint Permiso (Hardcodeado para que siempre sea 23285)
app.get('/api/permiso/:id', (req, res) => {
    res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente"
    });
});

// 3. Catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en puerto ${PORT}`));
