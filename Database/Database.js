'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'uno.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Impossible d'ouvrir la base de données:", err.message);
  } else {
    console.log('Base de données connectée:', DB_PATH);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(15) UNIQUE,
    password VARCHAR(100)
  )`, (err) => {
    if (err) console.error('Erreur création table user:', err.message);
  });
});

// Stores a pre-hashed password — hashing is done in Server.js where bcrypt is installed
function createUser(username, hashedPassword) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function findUser(username) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM user WHERE username = ?',
      [username],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

module.exports = { createUser, findUser };
