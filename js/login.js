document.addEventListener("DOMContentLoaded", () => {
  const loggedInUser = localStorage.getItem("loggedInUser");
  const currentPage = window.location.pathname.split("/").pop();

  if (loggedInUser) {
    const user = JSON.parse(loggedInUser);

    // Kullanıcı login sayfasına erişmeye çalışıyorsa yönlendir
    if (currentPage === "login.html") {
      window.location.href = user.role === "admin" ? "admin.html" : "index.html";
      return;
    }

    // Admin sayfasına erişim kontrolü
    if (currentPage === "admin.html" && user.role !== "admin") {
      window.location.href = "index.html";
      return;
    }
  } else {
    // Giriş yapmamış kullanıcılar için admin sayfasına erişim engeli
    if (currentPage === "admin.html") {
      window.location.href = "login.html";
      return;
    }
  }

  // Navbar butonlarını kontrol et
  const loginButton = document.getElementById("login-btn");
  const registerButton = document.getElementById("register-btn");
  const logoutButton = document.getElementById("logoutBtn");

  if (loggedInUser) {
    if (loginButton) loginButton.style.display = "none";
    if (registerButton) registerButton.style.display = "none";
    if (logoutButton) logoutButton.style.display = "block";
  } else {
    if (loginButton) loginButton.style.display = "block";
    if (registerButton) registerButton.style.display = "block";
    if (logoutButton) logoutButton.style.display = "none";
  }

  // Çıkış yap butonuna tıklanırsa
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("authToken");
      window.location.href = "login.html";
    });
  }

  // Login form işlemi
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const usernameOrEmail = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!usernameOrEmail || !password) {
        showError("Kullanıcı adı/e-posta ve şifre boş olamaz!");
        return;
      }

      await loginUser(usernameOrEmail, password);
    });
  }

  // Hata mesajını göstermek için fonksiyon
  function showError(message) {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = "block";
    }
  }

  // Giriş işlemi
  async function loginUser(usernameOrEmail, password) {
    try {
      const response = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ usernameOrEmail, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Giriş başarısız.");
      }

      const { user, token } = result;

      localStorage.setItem("loggedInUser", JSON.stringify({
        username: user.username,
        role: user.role
      }));
      localStorage.setItem("authToken", token);

      window.location.href = user.role === "admin" ? "admin.html" : "index.html";
    } catch (err) {
      showError(err.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }
});