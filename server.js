const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dataDir = path.join(__dirname, 'data');

function getVehicles() {
  try {
    const p = path.join(dataDir, 'vehicles.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Error al leer vehicles.json:', e);
  }
  return [];
}

app.post('/consultar-placa', upload.none(), (req, res) => {
  const { placa, serie, vin } = req.body;
  const searchVal = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

  if (!searchVal) return res.status(400).json({ error: true, message: 'Ingrese dato.' });

  const vehicles = getVehicles();
  let foundVehicle = vehicles.find(v => {
      const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
      const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
      const st = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
      return p === searchVal || s === searchVal || st === searchVal;
  });

  if (foundVehicle) {
    // AQUÍ FORZAMOS EL PERMISO PARA QUE SIEMPRE SEA EL CORRECTO
    foundVehicle.numero_permiso = "PL/23285/TRA/OM/2020";
    return res.json({ error: false, data: [foundVehicle] });
  } else {
    return res.status(200).json({ error: true, code: 404, message: 'Datos no registrados en CNE' });
  }
});

// Forzamos el endpoint de permiso para que siempre devuelva el 23285
app.get('/api/permiso/:id', (req, res) => {
    return res.json({
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente"
    });
});

app.listen(PORT, '0.0.0.0', () => console.log(`API corriendo en el puerto ${PORT}`));
