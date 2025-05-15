const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const mysql = require('mysql2');

const app = express();
const PORT = 3000;

const saltRounds = 10;
const JWT_SECRET = 'secretkey';

// MySQL bağlantısı
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Cemil0104.', // Şifre eklendi
  database: 'haber_sistemi'
});

db.connect((err) => {
  if (err) {
    console.error('MySQL bağlantı hatası:', err);
    process.exit(1);
  }
  console.log('MySQL veritabanına bağlanıldı.');
});

// VAPID Anahtarları
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  'mailto:admin@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Abonelikleri saklamak için bir dizi
const subscriptions = [];

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));

// Statik dosya erişimi
const uploadDir = path.join(__dirname, 'uploads', 'img');
app.use('/uploads/img', express.static(uploadDir));

// Gerekli klasör yoksa oluştur
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/img'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi', '.mkv'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowedTypes.includes(ext));
};

const upload = multer({ storage, fileFilter });

// Dosya yükleme işlemi için multer yapılandırması
const storageImage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads', 'img'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const uploadImage = multer({
  storage: storageImage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir!'));
    }
  }
});

// Abonelik ekleme endpoint'i
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ message: 'Abonelik başarıyla eklendi.' });
});

// Bildirim gönderme fonksiyonu
function sendNotification(title, message) {
  subscriptions.forEach(subscription => {
    const payload = JSON.stringify({ title, message });
    webpush.sendNotification(subscription, payload).catch(err => {
      console.error('Bildirim gönderilemedi:', err);
    });
  });
}

// Kullanıcı kaydı
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tüm alanlar zorunludur.' });
  }

  try {
    const [existingUser] = await db.promise().query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Kullanıcı adı veya e-posta zaten kayıtlı.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await db.promise().query(
      'INSERT INTO users (username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, 'user', new Date()]
    );

    res.status(201).json({ message: 'Kayıt başarılı.' });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
});

// Giriş işlemi
app.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'Kullanıcı adı/e-posta ve şifre zorunludur.' });
  }

  try {
    const [users] = await db.promise().query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı/e-posta veya şifre.' });
    }

    const user = users[0];

    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı/e-posta veya şifre.' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Giriş başarılı',
      token,
      user: { username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası.', error: err.message });
  }
});

// JWT doğrulama middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'Token bulunamadı.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token geçersiz.' });
    req.user = user;
    next();
  });
};

// Admin kontrol middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için admin yetkisi gereklidir.' });
  }
  next();
};

// Editör kontrol middleware
const isEditor = (req, res, next) => {
  if (req.user.role !== 'editor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Bu işlem için editör veya admin yetkisi gereklidir.' });
  }
  next();
};

// Haber ekleme (Editör ve Admin)
app.post('/news', authenticateJWT, isEditor, (req, res) => {
  const { title, content, category, tags, image, video } = req.body;

  if (!title || !content || !category) {
    return res.status(400).json({ message: 'Başlık, içerik ve kategori zorunludur.' });
  }

  const newNews = {
    id: Date.now(),
    title,
    content,
    category,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    image: image || null,
    video: video || null
  };

  try {
    let newsList = [];
    if (fs.existsSync(newsFilePath)) {
      newsList = JSON.parse(fs.readFileSync(newsFilePath, 'utf8'));
    }

    newsList.push(newNews);
    fs.writeFileSync(newsFilePath, JSON.stringify(newsList, null, 2));

    res.status(201).json({ message: 'Haber başarıyla eklendi', news: newNews });
  } catch (err) {
    res.status(500).json({ message: 'Haber kaydedilemedi', error: err.message });
  }
});

// Tüm haberleri getir
app.get('/news', (req, res) => {
  try {
    const newsList = JSON.parse(fs.readFileSync(newsFilePath, 'utf8'));
    res.json(newsList);
  } catch (err) {
    res.status(500).json({ message: 'Haberler alınamadı', error: err.message });
  }
});

// Haber görüntüleme sayısını artırma
app.put('/news/:id/view', (req, res) => {
  const { id } = req.params;

  try {
    const newsList = JSON.parse(fs.readFileSync(newsFilePath, 'utf8'));
    const newsItem = newsList.find(news => news.id == id);

    if (!newsItem) {
      return res.status(404).json({ message: 'Haber bulunamadı.' });
    }

    newsItem.views = (newsItem.views || 0) + 1;
    fs.writeFileSync(newsFilePath, JSON.stringify(newsList, null, 2));

    res.status(200).json({ message: 'Görüntüleme sayısı artırıldı.', views: newsItem.views });
  } catch (err) {
    res.status(500).json({ message: 'Görüntüleme sayısı artırılamadı.', error: err.message });
  }
});

// Haber derecelendirme
app.post('/news/:id/rate', (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Geçerli bir derecelendirme (1-5) girin.' });
  }

  try {
    const newsList = JSON.parse(fs.readFileSync(newsFilePath, 'utf8'));
    const newsItem = newsList.find(news => news.id == id);

    if (!newsItem) {
      return res.status(404).json({ message: 'Haber bulunamadı.' });
    }

    newsItem.ratings = newsItem.ratings || [];
    newsItem.ratings.push(rating);
    newsItem.averageRating = (newsItem.ratings.reduce((a, b) => a + b, 0) / newsItem.ratings.length).toFixed(1);

    fs.writeFileSync(newsFilePath, JSON.stringify(newsList, null, 2));

    res.status(200).json({ message: 'Derecelendirme başarıyla eklendi.', averageRating: newsItem.averageRating });
  } catch (err) {
    res.status(500).json({ message: 'Derecelendirme eklenemedi.', error: err.message });
  }
});

// Yorum ekleme
app.post('/comments/:newsId', authenticateJWT, (req, res) => {
  const { newsId } = req.params;
  const { comment } = req.body;
  const { userId } = req.user;

  if (!comment) {
    return res.status(400).json({ message: 'Yorum alanı zorunludur.' });
  }

  const newComment = {
    id: Date.now(),
    userId,
    newsId,
    comment,
    date: new Date().toISOString(),
    approved: false
  };

  try {
    let commentsList = [];
    if (fs.existsSync(commentsFilePath)) {
      commentsList = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'));
    }

    commentsList.push(newComment);
    fs.writeFileSync(commentsFilePath, JSON.stringify(commentsList, null, 2));
    res.status(201).json({ message: 'Yorum kaydedildi', comment: newComment });
  } catch (err) {
    res.status(500).json({ message: 'Yorum kaydedilemedi', error: err.message });
  }
});

// Yorumlara cevap ekleme
app.post('/comments/:commentId/reply', authenticateJWT, (req, res) => {
  const { commentId } = req.params;
  const { reply } = req.body;
  const { userId } = req.user;

  if (!reply) {
    return res.status(400).json({ message: 'Cevap alanı zorunludur.' });
  }

  try {
    let commentsList = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'));
    const commentIndex = commentsList.findIndex(c => c.id == commentId);

    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Yorum bulunamadı.' });
    }

    const newReply = {
      id: Date.now(),
      userId,
      reply,
      date: new Date().toISOString()
    };

    commentsList[commentIndex].replies = commentsList[commentIndex].replies || [];
    commentsList[commentIndex].replies.push(newReply);

    fs.writeFileSync(commentsFilePath, JSON.stringify(commentsList, null, 2));
    res.status(201).json({ message: 'Cevap başarıyla eklendi.', reply: newReply });
  } catch (err) {
    res.status(500).json({ message: 'Cevap eklenemedi.', error: err.message });
  }
});

// Belirli habere ait yorumları getir
app.get('/comments/:newsId', (req, res) => {
  const { newsId } = req.params;

  try {
    const commentsList = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'));
    const filtered = commentsList.filter(c => c.newsId == newsId && c.approved);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Yorumlar alınamadı', error: err.message });
  }
});

// Yorum onaylama (Admin)
app.put('/comments/:commentId/approve', authenticateJWT, isAdmin, (req, res) => {
  const { commentId } = req.params;

  try {
    let commentsList = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'));
    const commentIndex = commentsList.findIndex(c => c.id == commentId);

    if (commentIndex === -1) {
      return res.status(404).json({ message: 'Yorum bulunamadı.' });
    }

    commentsList[commentIndex].approved = true;
    fs.writeFileSync(commentsFilePath, JSON.stringify(commentsList, null, 2));
    res.status(200).json({ message: 'Yorum onaylandı.', comment: commentsList[commentIndex] });
  } catch (err) {
    res.status(500).json({ message: 'Yorum onaylanamadı', error: err.message });
  }
});

// Onay bekleyen yorumları getir
app.get('/comments/pending', authenticateJWT, isAdmin, (req, res) => {
  try {
    const commentsList = JSON.parse(fs.readFileSync(commentsFilePath, 'utf8'));
    const pendingComments = commentsList.filter(c => !c.approved);
    res.json(pendingComments);
  } catch (err) {
    res.status(500).json({ message: 'Yorumlar alınamadı', error: err.message });
  }
});

// Video yükleme desteği
app.post('/upload', upload.fields([{ name: 'image' }, { name: 'video' }]), (req, res) => {
  try {
    const imagePath = req.files['image'] ? `/uploads/img/${req.files['image'][0].filename}` : null;
    const videoPath = req.files['video'] ? `/uploads/img/${req.files['video'][0].filename}` : null;

    res.status(200).json({
      message: 'Dosyalar başarıyla yüklendi.',
      imagePath,
      videoPath
    });
  } catch (err) {
    res.status(500).json({ message: 'Dosyalar yüklenemedi.', error: err.message });
  }
});

// Resim yükleme endpoint'i
app.post('/upload-image', uploadImage.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Dosya yüklenemedi!' });
  }

  res.status(200).json({
    message: 'Dosya başarıyla yüklendi.',
    filePath: `/uploads/img/${req.file.filename}`
  });
});

// Varsayılan admin hesabı oluştur
async function createDefaultAdmin() {
  const adminEmail = 'admin@example.com';
  const adminUsername = 'admin';
  const plainPassword = 'MuşBitlis';

  try {
    const [users] = await db.promise().query('SELECT * FROM users WHERE role = ?', ['admin']);

    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
      await db.promise().query(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [adminUsername, adminEmail, hashedPassword, 'admin']
      );
      console.log('Varsayılan admin hesabı oluşturuldu.');
    }
  } catch (err) {
    console.error('Varsayılan admin hesabı oluşturulamadı:', err.message);
  }
}

// Sunucuyu başlat
createDefaultAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor.`);
  });
});