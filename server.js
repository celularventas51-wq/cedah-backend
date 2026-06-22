const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');

function getVehicles() {
    try {
        const p = path.join(dataDir, 'vehicles.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    } catch (e) { return []; }
}

// 1. Consulta Placa (Búsqueda flexible)
app.post('/consultar-placa', (req, res) => {
    const { placa, serie, vin } = req.body;
    const val = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

    const vehicles = getVehicles();
    let found = vehicles.find(v => {
        const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
        const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
        const st = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
        return p === val || s === val || st === val;
    });

    if (found) {
        found.numero_permiso = "PL/23285/TRA/OM/2020"; // FORZADO
        return res.json({ error: false, data: [found] });
    }
    return res.status(200).json({ error: true });
});

// 2. Permiso (CRÍTICO: Sin esto, los QRs no cargan información)
app.get('/api/permiso/:id', (req, res) => {
    res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente"
    });
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log('API Activa');
});
