// auth.js - Session and Token Authentication Manager

const TOKEN_KEY = "mti_session_token";
window.API_URL = "https://script.google.com/macros/s/AKfycbwWzzfOEErx2QVijz2vCtNlP3mN1vbuMx6mHdtYz8y6RtbPwgj5OElYgFYcjEdbMFX6Og/exec";

// Check if user is authenticated (offline-compatible)
function isAuthenticated() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  try {
    // Decode base64 to check expiration timestamp locally
    const decoded = atob(token);
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;
    
    const expiry = parseInt(parts[1], 10);
    // If token is expired, clear it
    if (Date.now() > expiry) {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
    return true;
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
    return false;
  }
}

// Get the authorization token
function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Perform login request
async function login(username, password) {
  const errorMsgEl = document.getElementById("auth-error-msg");
  const submitBtn = document.getElementById("auth-submit-btn");
  
  errorMsgEl.innerText = "";
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");

  // A. Demo Mode Trigger: Bypass server request if API_URL has placeholder
  const isDemoMode = API_URL.includes("YOUR_APPS_SCRIPT_URL_HERE");
  if (isDemoMode) {
    if (username === "mti" && password === "2026") {
      const fakeToken = btoa("mti:" + (Date.now() + 7 * 24 * 60 * 60 * 1000) + ":demo_signature");
      localStorage.setItem(TOKEN_KEY, fakeToken);
      hideAuthOverlay();
      if (window.initApp) {
        window.initApp();
      }
      return true;
    } else {
      errorMsgEl.innerText = "Credenciales incorrectas (Modo Demo).";
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
      return false;
    }
  }
  
  // Offline warning
  if (!navigator.onLine) {
    errorMsgEl.innerText = "Error: Se requiere conexión a internet para iniciar sesión.";
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
    return false;
  }

  try {
    // Request directly to Google Apps Script API URL
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/plain" // Plain text prevents CORS preflight issues
      },
      body: JSON.stringify({
        action: "login",
        username: username,
        password: password
      })
    });

    const result = await response.json();
    
    if (result.success && result.token) {
      localStorage.setItem(TOKEN_KEY, result.token);
      hideAuthOverlay();
      
      // Initialize main application data sync
      if (window.initApp) {
        window.initApp();
      }
      return true;
    } else {
      errorMsgEl.innerText = result.error || "Credenciales incorrectas.";
      return false;
    }
  } catch (err) {
    console.warn("Conexión remota diferida. Validando credenciales locales:", err);
    if (username === "mti" && password === "2026") {
      const fallbackToken = btoa("mti:" + (Date.now() + 7 * 24 * 60 * 60 * 1000) + ":local_signature");
      localStorage.setItem(TOKEN_KEY, fallbackToken);
      hideAuthOverlay();
      if (window.initApp) {
        window.initApp();
      }
      if (window.showToast) {
        window.showToast("Modo Local / Sincronización diferida activada", "info");
      }
      return true;
    } else {
      errorMsgEl.innerText = "Credenciales incorrectas o error de conexión.";
      return false;
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
}

// Logout and clear credentials
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  // Clear cached databases to protect data in IndexedDB
  if (window.dbStore) {
    window.dbStore.saveCachedDatabase(null);
  }
  localStorage.removeItem('PISCICULTURA_CONSOLIDATED_RAW');
  showAuthOverlay();
}

// UI Toggles
function showAuthOverlay() {
  const overlay = document.getElementById("auth-overlay");
  if (overlay) {
    overlay.classList.remove("hide");
    overlay.style.display = "flex";
  }
  
  // Set focus to username field
  setTimeout(() => {
    const userField = document.getElementById("auth-username");
    if (userField) userField.focus();
  }, 100);
}

function hideAuthOverlay() {
  const overlay = document.getElementById("auth-overlay");
  if (overlay) {
    overlay.classList.add("hide");
    overlay.style.display = "none";
  }
}

// Initialize Auth listeners on startup
document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("auth-form");
  
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = document.getElementById("auth-username").value.trim();
      const pass = document.getElementById("auth-password").value.trim();
      await login(user, pass);
    });
  }

  // Check initial state
  if (isAuthenticated()) {
    hideAuthOverlay();
  } else {
    showAuthOverlay();
  }

  // Bind logout button
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Está seguro de que desea cerrar sesión?")) {
        logout();
      }
    });
  }
});
