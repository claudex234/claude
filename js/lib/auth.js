// Gate de autenticación. Bloquea el render de la app hasta que haya sesión.
// Solo magic link por email (Supabase OTP).
import { supabase } from "./supabase.js";

// El magic link siempre vuelve a la app desplegada en GitHub Pages,
// aunque solicites el correo desde localhost u otro entorno.
const REDIRECT_URL = "https://duecaz.github.io/test/";

const renderLoginScreen = (root, { onSignedIn }) => {
  root.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-logo"></div>
          <div>
            <div class="auth-title">Proforma</div>
            <div class="auth-subtitle">Acceso solo para el dueño</div>
          </div>
        </div>
        <form id="auth-form" class="auth-form" autocomplete="off">
          <label class="auth-label" for="auth-email">Tu email</label>
          <input id="auth-email" name="email" type="email" required placeholder="tu@correo.com" class="auth-input" />
          <button type="submit" class="auth-btn">Enviarme el enlace</button>
          <div id="auth-msg" class="auth-msg" aria-live="polite"></div>
        </form>
        <p class="auth-foot">Te llegará un correo con un enlace de un solo uso. Hace click y entras.</p>
      </div>
    </div>
  `;

  const form = root.querySelector("#auth-form");
  const msg = root.querySelector("#auth-msg");
  const input = root.querySelector("#auth-email");
  const btn = form.querySelector(".auth-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email) return;
    btn.disabled = true;
    btn.textContent = "Enviando…";
    msg.textContent = "";
    msg.className = "auth-msg";
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: REDIRECT_URL },
      });
      if (error) throw error;
      msg.textContent = `Revisa ${email} y abrí el enlace en este mismo navegador.`;
      msg.classList.add("auth-msg-ok");
      btn.textContent = "Enlace enviado";
    } catch (err) {
      msg.textContent = err.message || "No pude enviar el enlace. Probá de nuevo.";
      msg.classList.add("auth-msg-err");
      btn.disabled = false;
      btn.textContent = "Enviarme el enlace";
    }
  });

  // Si la sesión llega por la redirección (detectSessionInUrl), enganchamos:
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      sub.subscription.unsubscribe();
      onSignedIn(session);
    }
  });
};

// Espera a tener sesión. Si no hay, monta login en `root` y resuelve cuando entra.
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
