const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dataDir = path.join(__dirname, 'data');

// Helper seguro para leer vehículos
function getVehicles() {
    try {
        const p = path.join(dataDir, 'vehicles.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    } catch (e) { 
        console.error("Error leyendo base de datos de vehículos:", e);
        return []; 
    }
}

// 1. Endpoint: Consulta de Placas (Búsqueda Flexible Normalizada)
app.post('/consultar-placa', (req, res) => {
    const { placa, serie, vin } = req.body;
    const val = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

    if (!val) {
        return res.status(400).json({ error: true, message: 'Ingrese datos válidos para la consulta.' });
    }

    const vehicles = getVehicles();
    let found = vehicles.find(v => {
        const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
        const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
        const st = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
        return p === val || s === val || st === val;
    });

    if (found) {
        // Clonación limpia y forzado de permiso único estático invariante
        const respuestaLimpia = { ...found };
        respuestaLimpia.numero_permiso = "PL/23285/TRA/OM/2020";
        return res.json({ error: false, data: [respuestaLimpia] });
    }
    
    return res.status(200).json({ error: true, code: 404, message: 'Vehículo no registrado en CNE' });
});

// 2. Endpoint: Detalle de Permiso para Rutas QR
app.get('/api/permiso/:id', (req, res) => {
    res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente"
    });
});

// 3. Endpoint: Obtener todos los reportes (Panel de administración)
app.get('/api/reportes', (req, res) => {
    try {
        const p = path.join(dataDir, 'reports.json');
        const r = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
        res.json(r);
    } catch (e) { 
        res.json([]); 
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`🚀 Motor API de Consulta CNE ejecutándose en Puerto ${PORT}`);
    console.log(`===================================================`);
});
