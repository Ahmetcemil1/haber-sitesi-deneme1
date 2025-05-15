document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profileForm');

  // Kullanıcı bilgilerini yükle
  function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (user) {
      document.getElementById('username').value = user.username;
      document.getElementById('email').value = user.email;
    } else {
      alert('Giriş yapmanız gerekiyor.');
      window.location.href = 'login.html';
    }
  }

  // Kullanıcı bilgilerini güncelle
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !email) {
      alert('Kullanıcı adı ve e-posta alanları zorunludur.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!user) {
      alert('Giriş yapmanız gerekiyor.');
      window.location.href = 'login.html';
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        throw new Error('Profil güncellenemedi.');
      }

      const updatedUser = await response.json();
      localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      alert('Profil başarıyla güncellendi.');
    } catch (err) {
      console.error('Profil güncelleme hatası:', err);
      alert('Profil güncellenirken bir hata oluştu.');
    }
  });

  loadUserProfile();
});