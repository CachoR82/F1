const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'https://CachoR82.github.io/F1' }));
app.use(express.json());

// Inicializar Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

// Endpoint para buscar
app.all('/api/buscar', async (req, res) => {
  try {
    const { torre, piso, depto, clave } = req.body;
    if (!torre || !piso || !depto || !clave) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const claveDoc = `${torre}_${piso}_${depto}`;
    const docRef = db.collection('idFum').doc(claveDoc);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(200).json({ exists: false, data: { Servicio: false, Comentarios: '' } });
    }

    const data = docSnap.data();
    if (data.passCrypt) {
      const passwordMatch = await bcrypt.compare(clave, data.passCrypt);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }
    }

    res.status(200).json({
      exists: true,
      data: { Servicio: data.Servicio || false, Comentarios: data.Comentarios || '' },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar: ' + error.message });
  }
});

// Endpoint para guardar
app.post('/api/guardar', async (req, res) => {
  try {
    const { torre, piso, depto, clave, servicio, comentarios } = req.body;
    if (!torre || !piso || !depto) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const claveDoc = `${torre}_${piso}_${depto}`;
    let hashedPassword = '';
    if (clave) {
      hashedPassword = await bcrypt.hash(clave, 10);
    }

    const datos = {
      Torre: parseInt(torre),
      Piso: parseInt(piso),
      Depto: depto,
      Servicio: servicio || false,
      Comentarios: servicio ? comentarios || '' : '',
      passCrypt: hashedPassword,
      Timestamp: admin.firestore.Timestamp.now(),
    };

    await db.collection('idFum').doc(claveDoc).set(datos);
    res.status(200).json({ message: 'Datos guardados con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar: ' + error.message });
  }
});

module.exports = app;
