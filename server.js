const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

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

// 1. Validar placa o serie (Normalizado y forzando el 23285)
app.post('/consultar-placa', upload.none(), (req, res) => {
  const { placa, serie, vin } = req.body;
  // Quitamos guiones y espacios a la entrada
  const searchVal = (placa || serie || vin || '').trim().toUpperCase().replace(/[\s-]/g, '');

  if (!searchVal) {
    return res.status(400).json({ error: true, message: 'Debe ingresar un valor' });
  }

  const vehicles = getVehicles();
  let foundVehicle = vehicles.find(v => {
      // Quitamos guiones y espacios a los datos del JSON para compararlos limpiamente
      const p = (v.matricula_placa || '').toUpperCase().replace(/[\s-]/g, '');
      const s = (v.vin || '').toUpperCase().replace(/[\s-]/g, '');
      const sticker = (v.sticker_id || '').toUpperCase().replace(/[\s-]/g, '');
      
      return p === searchVal || s === searchVal || sticker === searchVal;
  });

  if (foundVehicle) {
    // FORZAMOS EL PERMISO
    foundVehicle.numero_permiso = "PL/23285/TRA/OM/2020";
    return res.json({ error: false, data: [foundVehicle] });
  } else {
    return res.status(200).json({ error: true, code: 404, message: 'Datos de vehículo no registrados en CNE' });
  }
});

// 2. Endpoint que siempre devuelve el Permiso 23285 (KAYJES)
app.get(['/api/permiso/:id', '/api/permiso/PL/:num/TRA/OM/:year'], (req, res) => {
    return res.json({
        uuid: req.params.id || "9e9aacc6-4668-4a86-a820-45fb940a4022",
        razon_social: "KAYJES INTERNACIONAL S.A. DE C.V.",
        numero_permiso: "PL/23285/TRA/OM/2020",
        vigencia: "Del 2020-01-15 al 2050-12-16",
        estado: "Vigente",
        productos: ["diesel", "gasolina"]
    });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API ejecutándose en el puerto ${PORT}`);
});
