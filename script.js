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
        <td><input type="number" class="precio" value="0" step="0.50"></td>
        <td style="text-align: right;"><span class="imp">$0.00</span></td>
        <td class="no-print" style="text-align: center;"><button class="del" style="color:red;border:none;background:none;cursor:pointer;">x</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.qty').addEventListener('input', calcular);
    tr.querySelector('.precio').addEventListener('input', calcular);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); calcular(); });
    calcular();
}

function calcular() {
    let sub = 0;
    document.querySelectorAll('#tbody-productos tr').forEach(tr => {
        const q = parseFloat(tr.querySelector('.qty').value) || 0;
        const p = parseFloat(tr.querySelector('.precio').value) || 0;
        const imp = q * p;
        tr.querySelector('.imp').textContent = formatear(imp);
        sub += imp;
    });
    const iva = sub * 0.16;
    const total = sub + iva;

    document.getElementById('subtotal').textContent = formatear(sub);
    document.getElementById('iva').textContent = formatear(iva);
    document.getElementById('total').textContent = formatear(total);
}

function formatear(n) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function generarPDF() {
    const element = document.getElementById('cotizacion');
    const folio = document.getElementById('folio').value;

    // Activamos modo PDF
    element.classList.add('modo-pdf');

    const opt = {
        margin: 0, // MARGEN CERO para controlar todo con CSS
        filename: `Cotizacion_${folio}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 2,
            useCORS: true, // CRÍTICO: Permite cargar la imagen del servidor
            scrollY: 0
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('modo-pdf');
    }).catch(err => {
        console.error(err);
        alert("Si estás viendo esto localmente, el logo fallará. Sube los archivos a GitHub Pages y funcionará perfecto.");
        element.classList.remove('modo-pdf');
    });
}