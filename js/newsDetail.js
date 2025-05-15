// js/newsDetail.js
document.addEventListener('DOMContentLoaded', () => {
  const newsId = localStorage.getItem('selectedNewsId');
  if (!newsId) {
    alert("Haber bulunamadı.");
    return;
  }

  const titleEl = document.getElementById('newsTitle');
  const imageEl = document.getElementById('newsImage');
  const contentEl = document.getElementById('newsContent');

  function resolveImagePath(path) {
    return path && path.startsWith('http') ? path : `uploads/img/${path}`;
  }
  // Sayfa yüklendiğinde kontrol et ve butonları yönet
window.onload = function () {
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn');
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  
  if (isAdminLoggedIn !== 'true') {
    window.location.href = 'login.html';
  } else {
    fetchAndDisplayNews();
  }

  // Giriş yap ve kayıt ol butonlarını kontrol et
  const loginBtn = document.getElementById("loginButton");
  const registerBtn = document.getElementById("registerButton");
  const logoutBtn = document.getElementById("logoutButton");
  
  // Eğer kullanıcı giriş yapmışsa login ve register butonlarını sakla
  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block"; // Çıkış butonu görünür
  } else {
    // Giriş yapmamış kullanıcı için
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (registerBtn) registerBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none"; // Çıkış butonu gizli
  }

  // Çıkış yap
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem('isAdminLoggedIn');
      window.location.href = "login.html";
    });
  }
};

// Çıkış yap butonunun işlevi
document.getElementById('logoutBtn').addEventListener('click', function () {
  localStorage.setItem('isAdminLoggedIn', 'false');
  localStorage.removeItem("loggedInUser");
  window.location.href = 'login.html';
});

  fetch('assets/news.json')
    .then(res => res.json())
    .then(data => {
      const selectedNews = data.find(n => n.id == newsId);
      if (!selectedNews) {
        titleEl.textContent = "Haber bulunamadı.";
        return;
      }

      titleEl.textContent = selectedNews.title;
      imageEl.src = resolveImagePath(selectedNews.image);
      contentEl.textContent = selectedNews.content;

      renderComments(newsId);
    });

  // Yorumlara cevap ekleme fonksiyonu
  async function replyToComment(commentId, replyText) {
    try {
      const response = await fetch(`http://localhost:3000/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ reply: replyText })
      });

      if (!response.ok) {
        throw new Error('Cevap eklenemedi.');
      }

      const data = await response.json();
      alert('Cevap başarıyla eklendi.');
      loadComments(); // Yorumları yeniden yükle
    } catch (err) {
      console.error('Cevap ekleme hatası:', err);
      alert('Cevap eklenirken bir hata oluştu.');
    }
  }

  // Yorumları render etme
  function renderComments(newsId) {
    const commentList = document.getElementById('commentList');
    if (!commentList) return;
    commentList.innerHTML = '';

    fetch(`http://localhost:3000/comments/${newsId}`)
      .then(res => res.json())
      .then(comments => {
        comments.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.classList.add('comment-item');
          commentDiv.innerHTML = `
            <strong>${comment.userId}</strong>
            <p>${comment.comment}</p>
            <button class="reply-btn" data-id="${comment.id}">Cevapla</button>
            <div class="replies">
              ${(comment.replies || []).map(reply => `<p><strong>${reply.userId}:</strong> ${reply.reply}</p>`).join('')}
            </div>
          `;
          commentList.appendChild(commentDiv);
        });

        document.querySelectorAll('.reply-btn').forEach(button => {
          button.addEventListener('click', () => {
            const replyText = prompt('Cevabınızı yazın:');
            if (replyText) {
              replyToComment(button.dataset.id, replyText);
            }
          });
        });
      })
      .catch(err => {
        console.error('Yorumlar alınamadı:', err);
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
      const newsId = localStorage.getItem('selectedNewsId');

      if (!nameInput.value.trim() || !textInput.value.trim()) {
        alert("Ad ve yorum alanları boş bırakılamaz.");
        return;
      }

      addComment(newsId, nameInput.value.trim(), textInput.value.trim());

      nameInput.value = '';
      textInput.value = '';
    });
  }

  // Sesli okuma işlevi
  function readAloud(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'tr-TR'; // Türkçe dil desteği
    speechSynthesis.speak(speech);
  }

  // Sesli Oku butonuna tıklama olayı
  const readAloudButton = document.getElementById('readAloudButton');
  if (readAloudButton) {
    readAloudButton.addEventListener('click', () => {
      const newsContent = document.getElementById('newsContent').textContent;
      if (newsContent) {
        readAloud(newsContent);
      } else {
        alert('Haber içeriği yüklenemedi.');
      }
    });
  }

  // Paylaşım butonları işlevselliği
  const shareFacebook = document.getElementById('shareFacebook');
  const shareTwitter = document.getElementById('shareTwitter');
  const shareLinkedIn = document.getElementById('shareLinkedIn');

  if (shareFacebook) {
    shareFacebook.addEventListener('click', () => {
      const url = window.location.href;
      const title = document.getElementById('newsTitle').textContent;
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`, '_blank');
    });
  }

  if (shareTwitter) {
    shareTwitter.addEventListener('click', () => {
      const url = window.location.href;
      const title = document.getElementById('newsTitle').textContent;
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
    });
  }

  if (shareLinkedIn) {
    shareLinkedIn.addEventListener('click', () => {
      const url = window.location.href;
      const title = document.getElementById('newsTitle').textContent;
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    });
  }
});

// Haber ID'sine göre yorumları çekmek için bu fonksiyonu kullanabilirsiniz.
function loadComments(newsId) {
  fetch(`/comments/${newsId}`)
    .then(response => response.json())
    .then(comments => {
      const commentsList = document.getElementById('comments-list');
      commentsList.innerHTML = '';  // Önceki yorumları temizle

      // Her yorumu sayfada göstermek
      comments.forEach(comment => {
        const commentElement = document.createElement('div');
        commentElement.classList.add('comment');
        commentElement.innerHTML = `
          <p><strong>Kullanıcı ${comment.userId}:</strong> ${comment.comment}</p>
          <p><em>${new Date(comment.date).toLocaleString()}</em></p>
        `;
        commentsList.appendChild(commentElement);
      });
    })
    .catch(error => console.error('Yorumlar yüklenemedi', error));
}

// Sayfa yüklendiğinde, habere ait yorumları yükle
// Dinamik olarak haberin ID'sini sayfadan alabilirsiniz
const newsId = document.getElementById('news-id').value;  // Bu ID'yi dinamik olarak almak gerekebilir
loadComments(newsId);

