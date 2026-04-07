import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(path.join(__dirname, '../..')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../html/connection.html'));
});

const port = 8000;
app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
