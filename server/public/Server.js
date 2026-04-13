import express from "express";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import {createUser, findUser} from '../../Database/Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.urlencoded({ extended: true })); //parser les données du formulaire
app.use(express.json());

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(path.join(__dirname, '../..')));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../../html/main.html')); });

app.get('/main', (req, res) => { res.sendFile(path.join(__dirname, '../../html/main.html')); });

app.get('/connection', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await findUser(username);
        if (!user) return res.status(401).send('Invalid credentials (username)'); //status code for invalid username

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).send('Invalid credentials(password)'); //status code for invalid password
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/jeux', (req, res) => { res.sendFile(path.join(__dirname, '../../html/jeux.html')); });

app.get('/lobby', (req, res) => { res.sendFile(path.join(__dirname, '../../html/lobby.html')); });

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        await createUser(username,password);
        res.redirect('/main');
    } catch (error) {
        if (error.message .includes('UNIQUE')) {
            res.status(409).send('Username already exists'); // Conflict status code for duplicate username
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
});

const port = 8000;
app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
