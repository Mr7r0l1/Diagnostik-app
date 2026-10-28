import { showToast } from './toast.js';

let paqueteSeleccionado = {
    nombre: 'Pack Taller Pro (60 Tokens)',
    tokens: 60,
    precio: '$249 MXN'
};

const NUMERO_WHATSAPP = '526566003508';
const CLABE_NUMERO = '638180010181775170';

export function initTokensListeners(getUsuarioEmail) {
    // 1. Botón Copiar CLABE
    const btnCopiar = document.getElementById('btnCopiarClabe');
    if (btnCopiar) {
        btnCopiar.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(CLABE_NUMERO);
                btnCopiar.textContent = '¡Copiado! ✓';
                btnCopiar.classList.add('bg-emerald-600', 'text-white');
                showToast('CLABE copiada al portapapeles: 6381 8001 0181 7751 70', 'success');
                setTimeout(() => {
                    btnCopiar.textContent = 'Copiar CLABE';
                    btnCopiar.classList.remove('bg-emerald-600', 'text-white');
                }, 2500);
            } catch (err) {
                // Respaldo manual
                const inputTemp = document.createElement('input');
                inputTemp.value = CLABE_NUMERO;
                document.body.appendChild(inputTemp);
                inputTemp.select();
                document.execCommand('copy');
                document.body.removeChild(inputTemp);
                showToast('CLABE copiada al portapapeles', 'success');
            }
        });
    }

    // 2. Selección interactiva de paquetes
    const packCards = document.querySelectorAll('.token-pack-card');
    packCards.forEach(card => {
        card.addEventListener('click', () => {
            packCards.forEach(c => {
                c.classList.remove('border-purple-500', 'bg-purple-950/20', 'ring-2', 'ring-purple-500/40');
                c.classList.add('border-slate-800');
            });

            card.classList.remove('border-slate-800');
            card.classList.add('border-purple-500', 'bg-purple-950/20', 'ring-2', 'ring-purple-500/40');

            const nombre = card.getAttribute('data-pack-name') || 'Paquete de Tokens';
            const tokens = card.getAttribute('data-pack-tokens') || '60';
            const precio = card.getAttribute('data-pack-price') || '$249 MXN';

            paqueteSeleccionado = { nombre, tokens, precio };
            actualizarEnlaceWhatsApp(getUsuarioEmail ? getUsuarioEmail() : null);
        });
    });

    // 3. Inicializar enlace de WhatsApp
    actualizarEnlaceWhatsApp(getUsuarioEmail ? getUsuarioEmail() : null);
}

export function actualizarEnlaceWhatsApp(userEmail) {
    const btnWp = document.getElementById('btnWhatsAppRecarga');
    if (!btnWp) return;

    let mensaje = `Hola, quiero continuar con el proceso de recarga de tokens para mi taller en DiagnostikAI.`;

    if (paqueteSeleccionado) {
        mensaje += `\n\n*Paquete elegido:* ${paqueteSeleccionado.nombre} (${paqueteSeleccionado.precio})`;
    }

    if (userEmail) {
        mensaje += `\n*Mi correo registrado:* ${userEmail}`;
    }

    mensaje += `\n\nAdjunto mi comprobante de transferencia a Nu para su acreditación. Muchas gracias.`;

    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    btnWp.setAttribute('href', url);
}
