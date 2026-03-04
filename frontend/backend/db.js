const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '192.168.219.192',
  user: 'root',
  password: 'Qwer1234!@',
  database: 'test'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MariaDB');
});

module.exports = db;

