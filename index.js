const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de Firebase Admin
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Ruta para buscar datos
app.post('/api/buscar', async (req, res) => {
    try {
        const { torre, piso, depto, clave } = req.body;

        if (!torre || !piso || !depto || !clave) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const claveDoc = `${torre}_${piso}_${depto}`;
        const docRef = db.collection('idFum').doc(claveDoc);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(200).json({ Servicio: false, Comentarios: '' });
        }

        const data = docSnap.data();
        const passCrypt = data.passCrypt || '';

        if (passCrypt !== '') {
            const passwordMatch = await bcrypt.compare(clave, passCrypt);
            if (!passwordMatch) {
                return res.status(401).json({ error: 'Contraseña incorrecta. Intenta de nuevo.' });
            }
        }

        return res.status(200).json({
            Servicio: data.Servicio || false,
            Comentarios: data.Comentarios || '',
        });
    } catch (error) {
        console.error('Error al buscar:', error);
        return res.status(500).json({ error: 'Error al buscar: ' + error.message });
    }
});

// Ruta para guardar datos
app.post('/api/guardar', async (req, res) => {
    try {
        const { torre, piso, depto, clave, servicio, comentarios } = req.body;

        if (!torre || !piso || !depto || !clave) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const claveDoc = `${torre}_${piso}_${depto}`;
        let hashedPassword = '';

        if (clave !== '') {
            hashedPassword = await bcrypt.hash(clave, 10);
        }

        const datos = {
            Torre: torre,
            Piso: piso,
            Depto: depto,
            Servicio: servicio,
            Comentarios: comentarios || '',
            passCrypt: hashedPassword,
            Timestamp: admin.firestore.Timestamp.now(),
        };

        await db.collection('idFum').doc(claveDoc).set(datos);
        return res.status(200).json({ message: 'Datos guardados con éxito.' });
    } catch (error) {
        console.error('Error al guardar:', error);
        return res.status(500).json({ error: 'Error al guardar: ' + error.message });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;

app.get('/api/informe-fumigador', async (req, res) => {
    try {
        const torre = parseInt(req.query.torre);
        const snapshot = await admin.firestore().collection('idFum')
            .where('Torre', '==', torre)
            .where('Servicio', '==', true)
            .get();
        const documentos = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.Timestamp) {
                data.Timestamp = data.Timestamp.toMillis(); // Convierte a milisegundos
            }
            return data;
        });
        res.json({ documentos });
    } catch (error) {
        res.status(500).json({ error: `Error al generar informe: ${error.message}` });
    }
});

app.get('/api/informe-completo', async (req, res) => {
    try {
        const torre = parseInt(req.query.torre);
        const snapshot = await admin.firestore().collection('idFum')
            .where('Torre', '==', torre)
            .get();
        const documentos = snapshot.docs.map(doc => {
            const data = doc.data();
            if (data.Timestamp) {
                data.Timestamp = data.Timestamp.toMillis(); // Convierte a milisegundos
            }
            return data;
        });
        res.json({ documentos });
    } catch (error) {
        res.status(500).json({ error: `Error al generar informe: ${error.message}` });
    }
});

app.post('/api/inicializar', async (req, res) => {
    try {
        const torre = parseInt(req.query.torre);
        const snapshot = await admin.firestore().collection('idFum')
            .where('Torre', '==', torre)
            .get();
        const batch = admin.firestore().batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                Comentarios: "",
                Servicio: false,
                Timestamp: null
            });
        });
        await batch.commit();
        res.json({ message: `Base de datos inicializada para Torre ${torre}.` });
    } catch (error) {
        res.status(500).json({ error: `Error al inicializar: ${error.message}` });
    }
});

app.post('/api/blanquear-password', async (req, res) => {
    try {
        const { docId } = req.body;
        const docRef = admin.firestore().collection('idFum').doc(docId);
        await docRef.update({ passCrypt: '' });
        res.json({ message: `Contraseña blanqueada para ${docId}.` });
    } catch (error) {
        res.status(500).json({ error: `Error al blanquear la contraseña: ${error.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
