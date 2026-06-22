const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const fs = require('fs');
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helpers para manejar los datos
const dataDir = path.join(__dirname, 'data');
function getVehicles() {
    try {
        const p = path.join(dataDir, 'vehicles.json');
        return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
    } catch (e) { return []; }
}

// Endpoint Consulta de Placas
app.post('/consultar-placa', (req, res) => {
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

// Endpoint Permisos (Siempre el mismo)
app.get('/api/permiso/:id', (req, res) => {
    res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente"
    });
});

// Endpoint Reportes (si lo sigues necesitando)
app.get('/api/reportes', (req, res) => {
    try {
        const p = path.join(dataDir, 'reports.json');
        const r = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
        res.json(r);
    } catch(e) { res.json([]); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`API activa en puerto ${PORT}`));
