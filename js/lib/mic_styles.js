// Estilos del wave de dictado por voz (5 barritas que pulsan).
// Se inyecta una sola vez en <head>; el flag por id evita duplicados.

export const ensureMicStyles = () => {
  if (document.getElementById("mic-wave-styles")) return;
  const s = document.createElement("style");
  s.id = "mic-wave-styles";
  s.textContent = `
    .mic-wave { display: none; gap: 3px; align-items: center; height: 14px; padding: 0 4px; }
    .mic-wave.on { display: inline-flex; }
    .mic-wave span {
      width: 3px; height: 100%; background: var(--danger, #e11d48);
      border-radius: 2px; transform-origin: center;
      animation: mic-pulse 0.9s ease-in-out infinite;
    }
    .mic-wave span:nth-child(2) { animation-delay: .12s; }
    .mic-wave span:nth-child(3) { animation-delay: .24s; }
    .mic-wave span:nth-child(4) { animation-delay: .36s; }
    .mic-wave span:nth-child(5) { animation-delay: .48s; }
    .mic-wave.loud span { animation-duration: 0.4s; }
    @keyframes mic-pulse {
      0%, 100% { transform: scaleY(0.3); opacity: .55; }
      50%      { transform: scaleY(1);   opacity: 1; }
    }
  `;
  document.head.appendChild(s);
};
