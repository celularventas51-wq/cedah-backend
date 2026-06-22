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

// Helpers
const dataDir = path.join(__dirname, 'data');
const vehiclesFilePath = path.join(dataDir, 'vehicles.json');

function getVehicles() {
    try {
        if (fs.existsSync(vehiclesFilePath)) {
            return JSON.parse(fs.readFileSync(vehiclesFilePath, 'utf8'));
        }
    } catch (e) { console.error(e); }
    return [];
}

// ENDPOINT DE CONSULTA (Normalizado y con Override de Permiso)
app.post('/consultar-placa', (req, res) => {
    const { placa, serie, vin } = req.body;
    const searchVal = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

    if (!searchVal) {
        return res.status(400).json({ error: true, message: 'Falta campo de búsqueda' });
    }

    const vehicles = getVehicles();
    
    // Buscamos en TODOS los campos posibles a la vez
    const foundVehicle = vehicles.find(v => {
        const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
        const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
        const st = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
        return p === searchVal || s === searchVal || st === searchVal;
    });

    if (foundVehicle) {
        // FORZAMOS PERMISO ESTÁTICO (Override)
        foundVehicle.numero_permiso = "PL/23285/TRA/OM/2020";
        return res.json({ error: false, data: [foundVehicle] });
    }

    return res.status(200).json({ error: true, code: 404, message: 'Datos no registrados en CNE' });
});

// Endpoint Permisos (Siempre estático)
app.get('/api/permiso/:id', (req, res) => {
    res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16"
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor activo en puerto ${PORT}`));
