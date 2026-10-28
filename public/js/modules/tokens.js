import { showToast } from './toast.js';

let paqueteSeleccionado = {
    nombre: 'Pack Taller Pro (60 Tokens)',
    tokens: 60,
    precio: '$249 MXN'
};

const NUMERO_WHATSAPP = '526566003508';
const CLABE_NUMERO = '638180010181775170';

export function initTokensListeners(getUsuarioEmail) {
    // 1. Botón Copiar CLABE con feedback visual
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

    // 2. Selección interactiva y reactiva de paquetes
    const packCards = document.querySelectorAll('.token-pack-card');

    function seleccionarTarjeta(card) {
        packCards.forEach(c => {
            c.classList.remove('is-selected');
            const indicator = c.querySelector('.select-indicator');
            if (indicator) {
                indicator.textContent = 'Seleccionar este paquete';
                indicator.className = 'select-indicator text-xs font-semibold text-slate-400 transition-colors';
            }
        });

        // Activar la tarjeta seleccionada
        card.classList.add('is-selected');
        const selectedIndicator = card.querySelector('.select-indicator');
        if (selectedIndicator) {
            selectedIndicator.textContent = 'Paquete Seleccionado ✓';
            selectedIndicator.className = 'select-indicator text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-300 transition-all';
        }

        const nombre = card.getAttribute('data-pack-name') || 'Paquete de Tokens';
        const tokens = card.getAttribute('data-pack-tokens') || '60';
        const precio = card.getAttribute('data-pack-price') || '$249 MXN';

        paqueteSeleccionado = { nombre, tokens, precio };
        actualizarEnlaceWhatsApp(getUsuarioEmail ? getUsuarioEmail() : null);
    }

    packCards.forEach(card => {
        card.addEventListener('click', () => {
            seleccionarTarjeta(card);
        });
    });

    // Iniciar con la tarjeta que tenga 'is-selected' o la del centro
    const cardInicial = document.querySelector('.token-pack-card.is-selected') || packCards[1] || packCards[0];
    if (cardInicial) {
        seleccionarTarjeta(cardInicial);
    } else {
        actualizarEnlaceWhatsApp(getUsuarioEmail ? getUsuarioEmail() : null);
    }
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
