document.addEventListener('DOMContentLoaded', iniciar);

function iniciar() {
    setFechas();
    document.getElementById('folio').value = generarFolio();
    agregarFila();

    document.getElementById('agregar').addEventListener('click', agregarFila);
    document.getElementById('descargarPDF').addEventListener('click', generarPDF);
    document.getElementById('fecha').addEventListener('change', actualizarVigencia);
}

function setFechas() {
    const hoy = new Date();
    // Ajuste fecha local
    const local = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('fecha').value = local;
    actualizarVigencia();
}

function actualizarVigencia() {
    const fecha = document.getElementById('fecha').value;
    if (fecha) {
        const d = new Date(fecha);
        d.setDate(d.getDate() + 15);
        const vig = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById('vigencia').value = vig;
    }
}

function generarFolio() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `F${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function agregarFila() {
    const tbody = document.getElementById('tbody-productos');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="number" class="qty" value="1" min="1"></td>
        <td><input type="text" class="desc" placeholder="Descripción"></td>
        <td><input type="number" class="precio" value="0" step="0.50" placeholder="Precio con IVA"></td>
        <td style="text-align: right;"><span class="imp">$0.00</span></td>
        <td class="no-print" style="text-align: center;"><button class="del" style="color:white; background:#dc3545; border:none; border-radius:4px; width:24px; height:24px; cursor:pointer;">x</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.qty').addEventListener('input', calcular);
    tr.querySelector('.precio').addEventListener('input', calcular);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); calcular(); });
    calcular();
}

// --- AQUÍ ESTÁ EL CAMBIO IMPORTANTE ---
function calcular() {
    let granTotal = 0; // Esta variable acumulará la suma de los "Totales con IVA"

    document.querySelectorAll('#tbody-productos tr').forEach(tr => {
        const q = parseFloat(tr.querySelector('.qty').value) || 0;
        const p = parseFloat(tr.querySelector('.precio').value) || 0; // Precio Unitario (YA CON IVA)

        const importeFila = q * p; // Importe Total de la línea (YA CON IVA)

        // Mostramos el importe en la tabla
        tr.querySelector('.imp').textContent = formatear(importeFila);

        // Sumamos al Gran Total
        granTotal += importeFila;
    });

    // Desglose Inverso (Matemática Fiscal Correcta: Total / 1.16)
    const subtotal = granTotal / 1.16;
    const iva = granTotal - subtotal;

    // Actualizamos los totales en pantalla
    document.getElementById('subtotal').textContent = formatear(subtotal);
    document.getElementById('iva').textContent = formatear(iva);
    document.getElementById('total').textContent = formatear(granTotal);
}

function formatear(n) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function generarPDF() {
    const element = document.getElementById('cotizacion');
    const folio = document.getElementById('folio').value;

    element.classList.add('modo-pdf');

    const opt = {
        margin: 0,
        filename: `Cotizacion_${folio}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            windowWidth: 800
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('modo-pdf');
    }).catch(err => {
        console.error(err);
        alert("Recuerda usar esto desde GitHub Pages para que cargue el logo.");
        element.classList.remove('modo-pdf');
    });
}
