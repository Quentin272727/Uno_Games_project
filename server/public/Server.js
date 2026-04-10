import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(path.join(__dirname, '../..')));

<<<<<<< HEAD
app.get('/connection', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/connection.html'));
});

app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/main.html'));
});

app.get('/jeux', (req, res) => {
=======
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/connection.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/main.html'));
});

app.get('/game', (req, res) => {
>>>>>>> e0f70a4150f9fb1f2f4adf190926965fef5c900d
    res.sendFile(path.join(__dirname, '../../html/jeux.html'));
});

const port = 8000;
app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
