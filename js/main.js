document.addEventListener("DOMContentLoaded", () => {
  let newsData = [];

  const resolveImagePath = (path) => {
    return path?.startsWith('http') ? path : `uploads/img/${path}`;
  };

  const newsList = document.getElementById('newsList');
  const searchInput = document.getElementById('searchInput');
  const modal = document.getElementById('newsModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  const modalImage = document.getElementById('modalImage');
  const closeBtn = document.querySelector('.closeBtn');
  const hamburger = document.getElementById('hamburger');
  const navbarLinks = document.querySelector('.navbar-links');
  const categoryFilter = document.getElementById('categoryFilter');

  // Hamburger menu açma/kapama
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navbarLinks.classList.toggle('active');
    });
  }

  // Kullanıcı giriş durumu kontrolü
  const loginButton = document.getElementById('loginButton');
  const registerButton = document.getElementById('registerButton');
  const logoutButton = document.getElementById('logoutButton');

  // Kullanıcı giriş yapmışsa
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  if (isLoggedIn) {
    loginButton.style.display = 'none';
    registerButton.style.display = 'none';
    logoutButton.style.display = 'block';
  } else {
    loginButton.style.display = 'block';
    registerButton.style.display = 'block';
    logoutButton.style.display = 'none';
  }

  // Çıkış yapma işlemi
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    window.location.reload();
  });

  // Haber görüntüleme sayısını artırma
  async function incrementViewCount(newsId) {
    try {
      const response = await fetch(`http://localhost:3000/news/${newsId}/view`, {
        method: 'PUT'
      });

      if (!response.ok) {
        throw new Error('Görüntüleme sayısı artırılamadı.');
      }

      const data = await response.json();
      console.log(`Haber ${newsId} görüntüleme sayısı: ${data.views}`);
    } catch (err) {
      console.error('Görüntüleme sayısı artırma hatası:', err);
    }
  }

  // Haber derecelendirme fonksiyonu
  async function rateNews(newsId, rating) {
    try {
      const response = await fetch(`http://localhost:3000/news/${newsId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });

      if (!response.ok) {
        throw new Error('Derecelendirme başarısız.');
      }

      const data = await response.json();
      alert(`Derecelendirme başarıyla eklendi. Ortalama Puan: ${data.averageRating}`);
    } catch (err) {
      console.error('Derecelendirme hatası:', err);
      alert('Derecelendirme sırasında bir hata oluştu.');
    }
  }

  // Modal açma fonksiyonu
  function showModal(news) {
    modalTitle.textContent = news.title || "Başlık Yok";
    modalImage.src = resolveImagePath(news.image) || 'https://via.placeholder.com/300x200';
    modalContent.textContent = news.content || "İçerik mevcut değil.";
    modal.style.display = 'flex';

    renderComments(news.id);

    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
      commentForm.dataset.newsId = news.id;
    }

    // Görüntüleme sayısını artır
    incrementViewCount(news.id);

    // Derecelendirme butonlarını ekle
    const ratingContainer = document.createElement('div');
    ratingContainer.style.marginTop = '20px';
    ratingContainer.innerHTML = '<h4>Haber Derecelendirme:</h4>';

    for (let i = 1; i <= 5; i++) {
      const starButton = document.createElement('button');
      starButton.textContent = `⭐ ${i}`;
      starButton.style.margin = '5px';
      starButton.addEventListener('click', () => rateNews(news.id, i));
      ratingContainer.appendChild(starButton);
    }

    modalContent.appendChild(ratingContainer);
  }

  // Yorumları render etme
  function renderComments(newsId) {
    const commentList = document.getElementById('commentList');
    if (!commentList) return;
    commentList.innerHTML = '';

    const comments = JSON.parse(localStorage.getItem(`comments_${newsId}`)) || [];
    if (comments.length === 0) {
      commentList.innerHTML = "<p>Henüz yorum yapılmamış.</p>";
      return;
    }

    comments.forEach(comment => {
      const commentDiv = document.createElement('div');
      commentDiv.classList.add('comment-item');
      commentDiv.innerHTML = `<strong>${comment.name}</strong><p>${comment.text}</p>`;
      commentList.appendChild(commentDiv);
    });
  }

  // Haberleri render etme
  function renderNews() {
    if (!newsData.length) return;

    let filtered = newsData.filter(news =>
      news.title?.toLowerCase().includes(searchInput.value.toLowerCase()) &&
      (categoryFilter.value === '' || news.category === categoryFilter.value)
    );

    newsList.innerHTML = '';
    filtered.forEach(news => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${resolveImagePath(news.image)}" alt="Haber Görseli">
        <h3>${news.title}</h3>
        <p><strong>[${news.category || 'Bilinmiyor'}]</strong> ${news.content.slice(0, 100)}...</p>
      `;
      card.addEventListener('click', () => showModal(news));
      newsList.appendChild(card);
    });
  }

  // Öne çıkan haberleri render etme
  function renderFeaturedNews() {
    const featuredNewsContainer = document.getElementById('featuredNewsContainer');
    if (!featuredNewsContainer) return;

    const categories = ['Teknoloji', 'Ekonomi', 'Spor', 'Sağlık'];
    featuredNewsContainer.innerHTML = '';

    categories.forEach(category => {
      const categoryNews = newsData.filter(news => news.category === category);
      if (categoryNews.length > 0) {
        const featured = categoryNews[0]; // Her kategoriden ilk haberi öne çıkar
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <img src="${resolveImagePath(featured.image)}" alt="Haber Görseli">
          <h3>${featured.title}</h3>
          <p><strong>[${featured.category}]</strong> ${featured.content.slice(0, 100)}...</p>
        `;
        card.addEventListener('click', () => showModal(featured));
        featuredNewsContainer.appendChild(card);
      }
    });
  }

  // Yorum ekleme işlemi
  async function addComment(newsId, name, text) {
    try {
      const newComment = { name, text };

      const commentsKey = `comments_${newsId}`;
      const existingComments = JSON.parse(localStorage.getItem(commentsKey)) || [];
      existingComments.push(newComment);
      localStorage.setItem(commentsKey, JSON.stringify(existingComments));

      renderComments(newsId);
    } catch (err) {
      console.error("Yorum ekleme hatası:", err);
      alert("Yorum eklenirken bir hata oluştu.");
    }
  }

  // Yorum ekleme formu işlemi
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const nameInput = document.getElementById('commentName');
      const textInput = document.getElementById('commentText');
      const newsId = e.target.dataset.newsId;

      if (!nameInput.value.trim() || !textInput.value.trim()) {
        alert("Ad ve yorum alanları boş bırakılamaz.");
        return;
      }

      addComment(newsId, nameInput.value.trim(), textInput.value.trim());

      nameInput.value = '';
      textInput.value = '';
    });
  }

  // Modal kapama işlemi
  closeBtn.onclick = () => modal.style.display = 'none';
  window.onclick = e => {
    if (e.target === modal) modal.style.display = 'none';
  };

  // Arama ve kategori filtreleme
  searchInput.addEventListener('input', renderNews);
  categoryFilter.addEventListener('change', renderNews);

  // Veri çekme
  fetch('assets/news.json')
    .then(res => {
      if (!res.ok) throw new Error('Veri alınamadı');
      return res.json();
    })
    .then(data => {
      newsData = data;
      localStorage.setItem('newsList', JSON.stringify(data));
      renderNews();
      renderFeaturedNews();
    })
    .catch(err => {
      console.error("Veri alınırken hata oluştu:", err);
      const stored = localStorage.getItem('newsList');
      if (stored) {
        newsData = JSON.parse(stored);
        renderNews();
        renderFeaturedNews();
      }
    });

  // Karanlık Mod İşlevselliği
  const toggleDarkMode = document.createElement('button');
  toggleDarkMode.textContent = 'Karanlık Mod';
  toggleDarkMode.style.position = 'fixed';
  toggleDarkMode.style.bottom = '20px';
  toggleDarkMode.style.right = '20px';
  toggleDarkMode.style.padding = '10px';
  toggleDarkMode.style.backgroundColor = '#007bff';
  toggleDarkMode.style.color = '#fff';
  toggleDarkMode.style.border = 'none';
  toggleDarkMode.style.borderRadius = '5px';
  toggleDarkMode.style.cursor = 'pointer';
  document.body.appendChild(toggleDarkMode);

  // Karanlık modu etkinleştir veya devre dışı bırak
  function applyDarkMode(isDarkMode) {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.querySelectorAll('nav, .card, footer').forEach(el => el.classList.add('dark-mode'));
    } else {
      document.body.classList.remove('dark-mode');
      document.querySelectorAll('nav, .card, footer').forEach(el => el.classList.remove('dark-mode'));
    }
  }

  // Kullanıcı tercihini kontrol et ve uygula
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  applyDarkMode(isDarkMode);

  // Butona tıklama olayını dinle
  toggleDarkMode.addEventListener('click', () => {
    const currentMode = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', !currentMode);
    applyDarkMode(!currentMode);
  });

  // Web Push Bildirimleri için Abonelik
  async function subscribeToNotifications() {
    if (!('serviceWorker' in navigator)) {
      alert('Tarayıcınız bildirimleri desteklemiyor.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: '<VAPID_PUBLIC_KEY>' // Backend'den alınan public key
      });

      await fetch('http://localhost:3000/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      alert('Bildirimlere başarıyla abone oldunuz!');
    } catch (err) {
      console.error('Abonelik hatası:', err);
      alert('Abonelik sırasında bir hata oluştu.');
    }
  }

  // Bildirim abone ol butonu ekle
  const notificationButton = document.createElement('button');
  notificationButton.textContent = 'Bildirimlere Abone Ol';
  notificationButton.style.position = 'fixed';
  notificationButton.style.bottom = '60px';
  notificationButton.style.right = '20px';
  notificationButton.style.padding = '10px';
  notificationButton.style.backgroundColor = '#28a745';
  notificationButton.style.color = '#fff';
  notificationButton.style.border = 'none';
  notificationButton.style.borderRadius = '5px';
  notificationButton.style.cursor = 'pointer';
  document.body.appendChild(notificationButton);

  notificationButton.addEventListener('click', subscribeToNotifications);
});

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
});