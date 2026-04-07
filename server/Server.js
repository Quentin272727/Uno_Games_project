import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../template/index.html'));
});

const port = 8000;
app.listen(port, () => {
    console.log(`server is running on http://localhost:${port}`);
});
