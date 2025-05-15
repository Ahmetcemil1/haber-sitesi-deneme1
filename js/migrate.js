const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Şifreleme işlemi için bir fonksiyon ekleniyor
function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

// MySQL bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Cemil0104.',
  multipleStatements: true // Birden fazla SQL sorgusunu çalıştırmak için
});

const sql = `
CREATE DATABASE IF NOT EXISTS haber_sistemi;

USE haber_sistemi;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Şifreler şifrelenmiş olarak saklanmalıdır
    role ENUM('user', 'admin', 'editor') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    tags VARCHAR(255),
    image_url VARCHAR(255),
    video_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    news_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

db.connect(err => {
  if (err) {
    console.error('MySQL bağlantı hatası:', err);
    return;
  }
  console.log('MySQL bağlantısı başarılı.');

  db.query(sql, (err, result) => {
    if (err) {
      console.error('SQL sorgusu çalıştırılamadı:', err);
      return;
    }
    console.log('Veritabanı ve tablolar başarıyla oluşturuldu.');
    db.end();
  });
});