document.addEventListener('DOMContentLoaded', iniciar);

let logoData = null; 

function iniciar() {
    cargarLogo();
    setFechas();
    document.getElementById('folio').value = generarFolio();
    agregarFila();

    document.getElementById('agregar').addEventListener('click', agregarFila);
    document.getElementById('descargarPDF').addEventListener('click', generarPDF);
    document.getElementById('fecha').addEventListener('change', calcularVigencia);
}

function cargarLogo() {
    const img = document.getElementById('logo-maestro');
    if(img.complete) logoData = imgABase64(img);
    else img.onload = () => { logoData = imgABase64(img); };
}

function imgABase64(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
}

function setFechas() {
    const hoy = new Date();
    const local = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('fecha').value = local;
    calcularVigencia();
}

function calcularVigencia() {
    const f = document.getElementById('fecha').value;
    if(f) {
        const d = new Date(f);
        d.setDate(d.getDate() + 15);
        const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById('vigencia').value = local;
    }
}

function generarFolio() {
    const d = new Date();
    const p = n => String(n).padStart(2,'0');
    return `F${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

function agregarFila() {
    const tbody = document.getElementById('tbody-productos');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="number" class="qty centro" value="1" min="1"></td>
        <td><input type="text" class="desc" placeholder="Descripción"></td>
        <td><input type="number" class="precio centro" value="0" step="0.50"></td>
        <td style="text-align: right;"><span class="imp">$0.00</span></td>
        <td class="no-print centro"><button class="btn-rojo">x</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.qty').addEventListener('input', calcular);
    tr.querySelector('.precio').addEventListener('input', calcular);
    tr.querySelector('.btn-rojo').addEventListener('click', () => { tr.remove(); calcular(); });
    calcular();
}

function calcular() {
    let granTotal = 0;
    document.querySelectorAll('#tbody-productos tr').forEach(tr => {
        const q = parseFloat(tr.querySelector('.qty').value) || 0;
        const p = parseFloat(tr.querySelector('.precio').value) || 0;
        const total = q * p;
        tr.querySelector('.imp').textContent = formatear(total);
        granTotal += total;
    });

    const sub = granTotal / 1.16;
    const iva = granTotal - sub;

    document.getElementById('subtotal').textContent = formatear(sub);
    document.getElementById('iva').textContent = formatear(iva);
    document.getElementById('total').textContent = formatear(granTotal);
}

function formatear(n) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// --- SOLUCIÓN DEFINITIVA A DATOS VACÍOS ---
function prepararImpresion(activar) {
    // Buscamos SOLO dentro del documento PDF
    const contenedor = document.getElementById('documento-pdf');
    const inputs = contenedor.querySelectorAll('input');
    
    if (activar) {
        // MODO PDF: Reemplazar inputs por SPANS de texto
        inputs.forEach(input => {
            const span = document.createElement('span');
            span.className = 'texto-impreso ' + (input.classList.contains('centro') ? 'centro' : '') + (input.classList.contains('derecha') ? 'derecha' : '');
            span.textContent = input.value; // Toma el valor escrito
            
            // Oculta el input y pone el span
            input.style.display = 'none';
            input.parentNode.insertBefore(span, input);
        });
        document.querySelectorAll('.no-print').forEach(e => e.style.display = 'none');
    } else {
        // MODO EDICION: Restaurar inputs
        const spans = contenedor.querySelectorAll('.texto-impreso');
        spans.forEach(s => s.remove());
        inputs.forEach(i => i.style.display = '');
        document.querySelectorAll('.no-print').forEach(e => e.style.display = '');
    }
}

function generarPDF() {
    const folio = document.getElementById('folio').value;
    
    // 1. Transformar inputs a texto fijo
    prepararImpresion(true);

    const element = document.getElementById('documento-pdf');
    
    const opt = {
        // Margen superior generoso (1.6in) para que el logo no choque
        margin:       [1.6, 0.5, 1.1, 0.5],
        filename:     `Cotizacion_${folio}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true }, 
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).toPdf().get('pdf').then(function(pdf) {
        const totalPages = pdf.internal.getNumberOfPages();
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();

        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            
            // HEADER (Logo y Datos)
            if (logoData) pdf.addImage(logoData, 'PNG', 0.5, 0.3, 1.2, 0.5);
            
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 68, 129);
            pdf.text("MÁXIMA TECNO MULTISERVICIOS", w - 0.5, 0.5, { align: "right" });
            
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80);
            pdf.text("SOLUCIONES TECNOLÓGICAS CONFIABLES", w - 0.5, 0.65, { align: "right" });
            pdf.text("Calle Guadalupe Victoria S/N, Col. Patricio Chirinos", w - 0.5, 0.8, { align: "right" });
            pdf.text("C.P. 95300, Tres Valles, Ver. | Tel: 288 139 69 42", w - 0.5, 0.9, { align: "right" });

            pdf.setDrawColor(0, 68, 129);
            pdf.line(0.5, 1.1, w - 0.5, 1.1);

            // FOOTER
            let fy = h - 1.0;
            pdf.setDrawColor(200);
            pdf.line(0.5, fy, w - 0.5, fy);
            
            pdf.setFontSize(6);
            pdf.setTextColor(100);
            pdf.setFont("helvetica", "bold");
            pdf.text("Términos y Condiciones:", 0.5, fy + 0.15);
            pdf.setFont("helvetica", "normal");
            pdf.text("- Tiempo de entrega: a partir del anticipo.", 0.5, fy + 0.25);
            pdf.text("- Forma de pago: 50% anticipo, 50% al finalizar satisfacción.", 0.5, fy + 0.35);
            
            pdf.text(`Página ${i} de ${totalPages}`, w - 0.5, h - 0.3, { align: "right" });
            pdf.text("MÁXIMA TECNO MULTISERVICIOS | Documento Digital", w / 2, h - 0.3, { align: "center" });
        }
    }).save().then(() => {
        // 2. Restaurar todo a la normalidad
        prepararImpresion(false);
    });
}
