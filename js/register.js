// Kullanıcı kaydı işlemi
async function registerUser(username, email, password) {
  const messageBox = document.getElementById("registerMessage");

  try {
    const newUser = {
      username,
      email,
      password,
      role: "user", // Yeni kullanıcılar varsayılan olarak 'user' rolü alır
      createdAt: new Date().toISOString()
    };

    const response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newUser)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Kayıt başarısız.");
    }

    messageBox.style.color = "green";
    messageBox.textContent = "Kayıt başarılı! Giriş yapabilirsiniz.";
    document.getElementById("registerForm").reset();
  } catch (err) {
    console.error("Hata:", err);
    messageBox.style.color = "red";
    messageBox.textContent = err.message || "Bir hata oluştu, lütfen tekrar deneyin.";
  }
}

// Kayıt formu işlemi
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !email || !password) {
      const messageBox = document.getElementById("registerMessage");
      messageBox.style.color = "red";
      messageBox.textContent = "Tüm alanlar zorunludur.";
      return;
    }

    await registerUser(username, email, password);
  });
}