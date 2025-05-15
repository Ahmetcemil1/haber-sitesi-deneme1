// Yardımcı fonksiyonlar

// Kullanıcı giriş kontrolü
export function checkUserRole(requiredRole) {
  const user = JSON.parse(localStorage.getItem("loggedInUser"));
  if (!user || user.role !== requiredRole) {
    alert(`Bu sayfaya yalnızca ${requiredRole} erişebilir.`);
    window.location.href = "index.html";
  }
}

// LocalStorage'dan kullanıcı bilgisi al
export function getLoggedInUser() {
  return JSON.parse(localStorage.getItem("loggedInUser"));
}

// LocalStorage'dan çıkış yap
export function logoutUser() {
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("isAdminLoggedIn");
  window.location.href = "login.html";
}

// API çağrısı için hata yönetimi
export async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP hata kodu: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API çağrısı hatası:", error);
    alert("Bir hata oluştu: " + error.message);
    throw error;
  }
}