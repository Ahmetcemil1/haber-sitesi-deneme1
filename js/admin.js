import { checkUserRole, logoutUser, fetchWithErrorHandling } from './utils.js';

let editIndex = null;
let newsList = []; // Global değişken olarak tanımlandı
const newsListAdmin = document.getElementById('newsListAdmin');

// Admin kontrolü
checkUserRole("admin");

// Sayfa yüklendiğinde
window.onload = function () {
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
  const user = JSON.parse(localStorage.getItem("loggedInUser"));

  if (isAdminLoggedIn !== 'true') {
    window.location.href = 'login.html';
  } else {
    fetchAndDisplayNews();
    fetchPendingComments();
  }

  // Butonları ayarla
  const loginBtn = document.getElementById("loginButton");
  const registerBtn = document.getElementById("registerButton");
  const logoutBtn = document.getElementById("logoutButton");

  if (user) {
    loginBtn && (loginBtn.style.display = "none");
    registerBtn && (registerBtn.style.display = "none");
    logoutBtn && (logoutBtn.style.display = "inline-block");

    logoutBtn?.addEventListener("click", logoutUser);
  } else {
    loginBtn && (loginBtn.style.display = "inline-block");
    registerBtn && (registerBtn.style.display = "inline-block");
    logoutBtn && (logoutBtn.style.display = "none");
  }
};

// Haber ekleme işlemi (video desteği ile)
async function addNews(title, content, category, tags, image, video) {
  try {
    const formData = new FormData();
    formData.append('image', image);
    if (video) {
      formData.append('video', video);
    }

    const uploadData = await fetchWithErrorHandling('http://localhost:3000/upload', {
      method: 'POST',
      body: formData
    });

    const imagePath = uploadData.imagePath;
    const videoPath = uploadData.videoPath || null;

    const newsItem = { title, content, category, tags, image: imagePath, video: videoPath };

    await fetchWithErrorHandling('http://localhost:3000/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsItem)
    });

    alert("Haber başarıyla eklendi.");
    document.getElementById('addNewsForm').reset();
    fetchAndDisplayNews();
  } catch (err) {
    console.error(err);
  }
}

// Haber düzenleme işlemi
async function editNews(newsId, updatedNews) {
  try {
    await fetchWithErrorHandling(`http://localhost:3000/news/${newsId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedNews)
    });

    alert("Haber başarıyla güncellendi.");
    document.getElementById('editNewsSection').style.display = 'none';
    fetchAndDisplayNews();
  } catch (err) {
    console.error("Haber güncelleme hatası:", err);
  }
}

// Haber ekleme formu işlemi
const addNewsForm = document.getElementById('addNewsForm');
if (addNewsForm) {
  addNewsForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const category = document.getElementById('category').value;
    const tags = document.getElementById('tags').value.trim();
    const image = document.getElementById('image').files[0];
    const video = document.getElementById('video')?.files[0];

    if (!title || !content || !category) {
      return alert("Başlık, içerik ve kategori zorunludur.");
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', category);
      formData.append('tags', tags);
      formData.append('image', image);
      if (video) {
        formData.append('video', video);
      }

      const response = await fetch('http://localhost:3000/news', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Haber eklenemedi.');
      }

      alert("Haber başarıyla eklendi.");
      addNewsForm.reset();
      window.location.href = 'index.html'; // Ana sayfaya yönlendirme
    } catch (err) {
      console.error("Haber ekleme hatası:", err);
      alert("Bir hata oluştu: " + err.message);
    }
  });
}

// Haberleri getir
async function fetchAndDisplayNews() {
  try {
    const newsList = await fetchWithErrorHandling('http://localhost:3000/news');
    displayNews(newsList);
  } catch (err) {
    console.error('Haberler alınamadı:', err);
  }
}

// Haberleri listele
function displayNews(newsList) {
  newsListAdmin.innerHTML = '';

  newsList.forEach((news, index) => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <strong>${news.title}</strong><br>
      <em>${news.category}</em><br>
      <small>${news.content}</small><br>
      <small>Etiketler: ${news.tags}</small><br>
      <img src="${news.image}" alt="Haber Görseli" width="100"><br>
      ${news.video ? `<video src="${news.video}" controls width="100"></video><br>` : ''}
      <button class="editBtn" data-index="${index}">Düzenle</button>
      <button class="deleteBtn" data-id="${news.id}">Sil</button>
    `;
    newsListAdmin.appendChild(listItem);
  });

  // Butonlara olay ekle
  document.querySelectorAll('.editBtn').forEach(button => {
    button.addEventListener('click', function () {
      const index = this.dataset.index;
      const news = newsList[index];
      document.getElementById('editTitle').value = news.title;
      document.getElementById('editContent').value = news.content;
      document.getElementById('editCategory').value = news.category;
      document.getElementById('editTags').value = news.tags;
      editIndex = index;
      showEditForm();
    });
  });

  document.querySelectorAll('.deleteBtn').forEach(button => {
    button.addEventListener('click', async function () {
      const newsId = this.dataset.id;
      if (!confirm("Haberi silmek istediğinize emin misiniz?")) return;

      await deleteNews(newsId);
    });
  });
}

// Haber düzenleme formu işlemi
const editNewsForm = document.getElementById('editNewsForm');
if (editNewsForm) {
  editNewsForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const title = document.getElementById('editTitle').value.trim();
    const content = document.getElementById('editContent').value.trim();
    const category = document.getElementById('editCategory').value;
    const tags = document.getElementById('editTags').value.trim();
    const image = document.getElementById('editImage')?.files[0];

    if (!title || !content) {
      return alert("Başlık ve içerik zorunludur.");
    }

    const updatedNews = { title, content, category, tags };

    if (image) {
      const formData = new FormData();
      formData.append('image', image);

      try {
        const uploadData = await fetchWithErrorHandling('http://localhost:3000/upload', {
          method: 'POST',
          body: formData
        });

        updatedNews.image = uploadData.filePath;
      } catch (err) {
        console.error("Resim yükleme hatası:", err);
        alert("Resim yükleme başarısız: " + err.message);
        return;
      }
    }

    const newsId = newsList[editIndex].id;
    await editNews(newsId, updatedNews);
  });
}

// Düzenleme formunu göster/gizle
function showEditForm() {
  document.getElementById('editNewsSection').style.display = 'block';
}

document.getElementById('cancelEditBtn')?.addEventListener('click', function () {
  document.getElementById('editNewsSection').style.display = 'none';
});

// Haber silme işlemi
async function deleteNews(newsId) {
  try {
    await fetchWithErrorHandling(`http://localhost:3000/news/${newsId}`, {
      method: 'DELETE'
    });

    alert("Haber silindi.");
    fetchAndDisplayNews();
  } catch (err) {
    console.error("Silme hatası:", err);
  }
}

// Hamburger menü
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  hamburger?.addEventListener('click', () => {
    navLinks?.classList.toggle('active');
  });
});

// Onay bekleyen yorumları listeleme ve onaylama işlemleri

// Onay bekleyen yorumları getir ve listele
async function fetchPendingComments() {
  try {
    const pendingComments = await fetchWithErrorHandling('http://localhost:3000/comments/pending', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    displayPendingComments(pendingComments);
  } catch (err) {
    console.error('Yorumlar alınamadı:', err);
  }
}

// Onay bekleyen yorumları listele
function displayPendingComments(comments) {
  const pendingCommentsList = document.getElementById('pendingCommentsList');
  pendingCommentsList.innerHTML = '';

  comments.forEach(comment => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <strong>${comment.comment}</strong><br>
      <em>Kullanıcı ID: ${comment.userId}</em><br>
      <button class="approveBtn" data-id="${comment.id}">Onayla</button>
    `;
    pendingCommentsList.appendChild(listItem);
  });

  document.querySelectorAll('.approveBtn').forEach(button => {
    button.addEventListener('click', async function () {
      const commentId = this.dataset.id;
      await approveComment(commentId);
    });
  });
}

// Yorumu onayla
async function approveComment(commentId) {
  try {
    await fetchWithErrorHandling(`http://localhost:3000/comments/${commentId}/approve`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    alert('Yorum onaylandı.');
    fetchPendingComments();
  } catch (err) {
    console.error('Yorum onaylama hatası:', err);
  }
}