// Gate de autenticación con email + password (Supabase).
// El admin (vos) crea los usuarios desde el panel de Supabase: no hay signup
// ni recuperación de contraseña en la UI.
import { supabase } from "./supabase.js";

const LAST_EMAIL_KEY = "proforma:lastEmail";

const renderLoginScreen = (root, { onSignedIn }) => {
  const lastEmail = (localStorage.getItem(LAST_EMAIL_KEY) || "").replace(/"/g, "&quot;");
  root.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-logo"></div>
          <div>
            <div class="auth-title">Proforma</div>
            <div class="auth-subtitle">Ingresá con tu contraseña</div>
          </div>
        </div>
        <form id="auth-form" class="auth-form">
          <label class="auth-label" for="auth-email">Email</label>
          <input id="auth-email" name="email" type="email" required autocomplete="username"
            value="${lastEmail}" class="auth-input" />

          <label class="auth-label" for="auth-pass">Contraseña</label>
          <input id="auth-pass" name="password" type="password" required autocomplete="current-password"
            class="auth-input" />

          <button type="submit" class="auth-btn">Entrar</button>
          <div id="auth-msg" class="auth-msg" aria-live="polite"></div>
        </form>
        <p class="auth-foot">Acceso restringido. Si olvidaste tu contraseña, pedile al admin que la resetee.</p>
      </div>
    </div>
  `;

  const form = root.querySelector("#auth-form");
  const msg = root.querySelector("#auth-msg");
  const emailInput = root.querySelector("#auth-email");
  const passInput = root.querySelector("#auth-pass");
  const btn = form.querySelector(".auth-btn");

  setTimeout(() => (lastEmail ? passInput : emailInput).focus(), 50);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) return;
    btn.disabled = true;
    btn.textContent = "Entrando…";
    msg.textContent = "";
    msg.className = "auth-msg";
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      localStorage.setItem(LAST_EMAIL_KEY, email);
      onSignedIn(data.session);
    } catch (err) {
      const code = err?.message || "";
      msg.textContent = /invalid login/i.test(code)
        ? "Email o contraseña incorrectos."
        : (code || "No pude iniciar sesión.");
      msg.classList.add("auth-msg-err");
      btn.disabled = false;
      btn.textContent = "Entrar";
      passInput.select();
    }
  });
};

export const waitForSession = (root) => new Promise(async (resolve) => {
  const { data } = await supabase.auth.getSession();
  if (data.session) return resolve(data.session);
  renderLoginScreen(root, { onSignedIn: (s) => resolve(s) });
});

export const signOut = async () => {
  await supabase.auth.signOut();
  location.reload();
};

export const currentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};
