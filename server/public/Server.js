import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.static(path.join(__dirname, '../../')));

// Permet d'accéder aux fichiers dans /html (tes pages, tes images, ton js client)
app.use(express.static(path.join(__dirname, '../../html')));

// Permet d'accéder aux fichiers dans /UNO (tes scripts de jeu)
app.use('../../UNO', express.static(path.join(__dirname, 'UNO')));

// Permet d'accéder aux images de cartes
app.use('../../images_cartes', express.static(path.join(__dirname, 'images_cartes')));

app.get('/connection', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/connection.html'));
});

app.get('/main', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/main.html'));
});

app.get('/jeux', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/jeux.html'));

});

const port = 8000;
app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
