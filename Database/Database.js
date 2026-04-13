import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

const db = new sqlite3.Database(':memory:');
const SALT_ROUNDS = 10;

db.serialize(() => {
  db.run(`CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(15) UNIQUE,
    password VARCHAR(100)
  )`);
});

export async function createUser(username, password) {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO user (username, password) VALUES (?, ?)',
      [username, hash],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export async function findUser(username) {
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

export {createUser, findUser};