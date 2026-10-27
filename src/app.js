import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Middlewares principales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Enrutamiento de la API
app.use('/api', apiRoutes);

// Endpoint de verificación de estado para Render
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'DiagnostikAI API' }));
app.get('/', (req, res) => {
    // Si la petición acepta HTML y existe public/index.html express.static lo atiende,
    // pero si se consulta como API devuelve estado:
    res.json({ status: 'online', message: 'Servidor DiagnostikAI activo' });
});

// Middleware de manejo de errores
app.use(errorHandler);

export default app;
