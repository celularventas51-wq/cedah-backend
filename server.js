const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento para imágenes de reportes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB por archivo
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Asegurar que las carpetas de datos existan
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const reportsFilePath = path.join(dataDir, 'reports.json');
if (!fs.existsSync(reportsFilePath)) {
  fs.writeFileSync(reportsFilePath, JSON.stringify([], null, 2));
}

const vehiclesFilePath = path.join(dataDir, 'vehicles.json');
const permitsFilePath = path.join(dataDir, 'permits.json');

// Helper para leer permisos
function getPermits() {
  try {
    if (fs.existsSync(permitsFilePath)) {
      return JSON.parse(fs.readFileSync(permitsFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error al leer permits.json:', e);
  }
  return [];
}

// Helper para leer vehículos
function getVehicles() {
  try {
    if (fs.existsSync(vehiclesFilePath)) {
      return JSON.parse(fs.readFileSync(vehiclesFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error al leer vehicles.json:', e);
  }
  return [];
}

// Helper para leer/escribir reportes
function getReports() {
  try {
    return JSON.parse(fs.readFileSync(reportsFilePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveReports(reports) {
  fs.writeFileSync(reportsFilePath, JSON.stringify(reports, null, 2));
}

// ---- Endpoints de API ----

// 1. Validar placa o serie (soporta multipart/form-data)
app.post('/consultar-placa', upload.none(), (req, res) => {
  const { placa, serie, vin, captcha_solution } = req.body;
  const searchVal = (placa || serie || vin || '').trim().toUpperCase();

  console.log(`[API] Consulta recibida - Tipo: ${placa ? 'Placa' : (vin ? 'VIN' : 'Serie')}, Valor: ${searchVal}`);

  if (!searchVal) {
    return res.status(400).json({ error: true, message: 'Debe ingresar una placa, serie o VIN para validar.' });
  }

  // Cargar vehículos de la "base de datos"
  const vehicles = getVehicles();
  let foundVehicle = null;

  if (placa) {
    foundVehicle = vehicles.find(v => v.matricula_placa.toUpperCase() === searchVal);
  } else if (vin) {
    // Buscar por VIN coincidente
    foundVehicle = vehicles.find(v => v.vin && v.vin.toUpperCase() === searchVal);
  } else if (serie) {
    // Buscar por serie o coincidencia
    foundVehicle = vehicles.find(v => 
      (v.vin && v.vin.toUpperCase() === searchVal) || 
      v.matricula_placa.toUpperCase() === searchVal || 
      (v.tipo_transporte && v.tipo_transporte.toUpperCase().includes(searchVal))
    );
  }

  if (foundVehicle) {
    return res.json({
      error: false,
      data: [foundVehicle]
    });
  } else {
    return res.status(200).json({
      error: true,
      code: 404,
      message: 'Datos de vehículo no registrados en CNE'
    });
  }
});

// 2. Recibir reporte ciudadano (soporta subida de hasta 3 imágenes)
app.post('/api/reportar', upload.array('reportImages[]', 3), (req, res) => {
  try {
    const {
      placa,
      descripcion,
      compartir_ubicacion,
      latitud,
      longitud,
      deseo_realizar_seguimiento,
      correo_electronico,
      telefono
    } = req.body;

    if (!placa || !descripcion) {
      return res.status(400).json({ error: true, message: 'La placa y la descripción son obligatorias.' });
    }

    // Generar un folio único
    const year = new Date().getFullYear();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const folio = `REP-${year}-${randNum}`;

    // Obtener nombres de archivos subidos
    const imageNames = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const nuevoReporte = {
      folio,
      placa: placa.toUpperCase(),
      descripcion,
      compartir_ubicacion: compartir_ubicacion === 'on',
      latitud: latitud || null,
      longitud: longitud || null,
      deseo_realizar_seguimiento: deseo_realizar_seguimiento === 'on',
      correo_electronico: correo_electronico || null,
      telefono: telefono || null,
      imagenes: imageNames,
      fecha: new Date().toISOString()
    };

    const reportes = getReports();
    reportes.unshift(nuevoReporte); // Agregar al inicio
    saveReports(reportes);

    console.log(`[API] Reporte ciudadano recibido. Folio: ${folio}, Placa: ${placa}`);

    return res.status(200).json({
      success: true,
      folio: folio,
      url_seguimiento: `/admin.html?buscar=${folio}`
    });
  } catch (error) {
    console.error('Error al procesar el reporte:', error);
    return res.status(500).json({ error: true, message: 'Error interno del servidor al procesar el reporte.' });
  }
});

// 3. Obtener todos los reportes (para panel admin)
app.get('/api/reportes', (req, res) => {
  const reportes = getReports();
  return res.json(reportes);
});

// 4. Obtener detalles de un permiso por UUID
app.get('/api/permiso/:id', (req, res) => {
  const permits = getPermits();
  // Support lookup by UUID or by permit number
  const foundPermit = permits.find(p => p.uuid === req.params.id || p.numero_permiso === req.params.id);
  if (foundPermit) {
    return res.json(foundPermit);
  } else {
    return res.status(404).json({ error: true, message: 'Permiso no encontrado en CNE' });
  }
});

// API: Buscar permiso por número completo (PL/XXXXX/TRA/OM/YYYY)
app.get('/api/permiso/PL/:num/TRA/OM/:year', (req, res) => {
  const permitNumber = `PL/${req.params.num}/TRA/OM/${req.params.year}`;
  const permits = getPermits();
  const foundPermit = permits.find(p => p.numero_permiso === permitNumber);
  if (foundPermit) {
    return res.json(foundPermit);
  } else {
    return res.status(404).json({ error: true, message: 'Permiso no encontrado en CNE' });
  }
});

// 5. Servir página para rutas de permiso (UUID o número)
app.get('/permiso/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/energia/permiso/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta QR: /energia/permiso/PL/23285/TRA/OM/2020
app.get('/energia/permiso/PL/:num/TRA/OM/:year', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor (0.0.0.0 = accesible desde toda la red y producción)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`🌐 Dominio producción: https://www.cedah.gob.mx`);
  console.log(`📂 Panel de Administración: http://localhost:${PORT}/admin.html`);
  console.log(`================================================================`);
});
