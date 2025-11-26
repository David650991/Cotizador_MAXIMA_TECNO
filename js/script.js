document.addEventListener('DOMContentLoaded', iniciar);

let logoData = null; // Guardará el logo en memoria

function iniciar() {
    prepararLogo(); // Carga el logo al inicio
    setFechas();
    document.getElementById('folio').value = generarFolio();
    agregarFila();

    document.getElementById('agregar').addEventListener('click', agregarFila);
    document.getElementById('descargarPDF').addEventListener('click', generarPDF);
    document.getElementById('fecha').addEventListener('change', calcularVigencia);
}

function prepararLogo() {
    const img = document.getElementById('logo-maestro');
    if (img.complete) {
        logoData = obtenerBase64(img);
    } else {
        img.onload = () => { logoData = obtenerBase64(img); };
    }
}

function obtenerBase64(img) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
}

function setFechas() {
    const hoy = new Date();
    // Ajuste zona horaria
    const local = new Date(hoy.getTime() - (hoy.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('fecha').value = local;
    calcularVigencia();
}

function calcularVigencia() {
    const f = document.getElementById('fecha').value;
    if (f) {
        const d = new Date(f);
        d.setDate(d.getDate() + 15);
        const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        document.getElementById('vigencia').value = local;
    }
}

function generarFolio() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `F${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

function agregarFila() {
    const tbody = document.getElementById('tbody-productos');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="number" class="qty centro" value="1" min="1"></td>
        <td><input type="text" class="desc" placeholder="Descripción"></td>
        <td><input type="number" class="precio centro" value="0" step="0.50" placeholder="Precio Final"></td>
        <td style="text-align: right; padding-right: 10px;"><span class="imp">$0.00</span></td>
        <td class="no-print centro"><button class="btn-rojo">x</button></td>
    `;
    tbody.appendChild(tr);

    // Eventos
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
        const totalLinea = q * p;
        tr.querySelector('.imp').textContent = formatear(totalLinea);
        granTotal += totalLinea;
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

// --- FUNCIÓN CLAVE PARA EVITAR CAMPOS VACÍOS ---
function prepararCamposParaImpresion(activar) {
    const inputs = document.querySelectorAll('input');
    if (activar) {
        inputs.forEach(input => {
            input.setAttribute('data-valor-real', input.value); // Guardamos valor
            input.setAttribute('value', input.value); // "Quemamos" el valor en el HTML
        });
        document.getElementById('documento-pdf').classList.add('modo-impresion');
    } else {
        document.getElementById('documento-pdf').classList.remove('modo-impresion');
    }
}

function generarPDF() {
    // 1. Quemar datos en HTML para que no salgan vacíos
    prepararCamposParaImpresion(true);

    const elemento = document.getElementById('documento-pdf');
    const folio = document.getElementById('folio').value;

    // Ocultar botones
    document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');

    const opt = {
        // [Top, Left, Bottom, Right] en Pulgadas
        // MARGEN SUPERIOR GRANDE (1.6) PARA QUE QUEPA EL LOGO SIN CHOCAR
        margin: [1.6, 0.5, 1.1, 0.5],
        filename: `Cotizacion_${folio}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(elemento).set(opt).toPdf().get('pdf').then(function (pdf) {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            // --- ENCABEZADO (Se repite en cada página) ---
            if (logoData) {
                // Logo (X: 0.5in, Y: 0.3in, Ancho: 1.2in, Alto: 0.5in)
                pdf.addImage(logoData, 'PNG', 0.5, 0.3, 1.2, 0.5);
            }

            // Datos Empresa (Alineados a la derecha)
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 68, 129); // Azul
            pdf.text("MÁXIMA TECNO MULTISERVICIOS", pageWidth - 0.5, 0.5, { align: "right" });

            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80); // Gris
            pdf.text("SOLUCIONES TECNOLÓGICAS CONFIABLES", pageWidth - 0.5, 0.65, { align: "right" });
            pdf.text("Calle Guadalupe Victoria S/N, Col. Patricio Chirinos", pageWidth - 0.5, 0.8, { align: "right" });
            pdf.text("C.P. 95300, Tres Valles, Ver. | Tel: 288 139 69 42", pageWidth - 0.5, 0.9, { align: "right" });

            // Línea azul separadora
            pdf.setDrawColor(0, 68, 129);
            pdf.setLineWidth(0.02);
            pdf.line(0.5, 1.1, pageWidth - 0.5, 1.1);


            // --- PIE DE PÁGINA (Se repite en cada página) ---
            let footerY = pageHeight - 1.0; // 1 pulgada desde abajo

            pdf.setDrawColor(200, 200, 200); // Gris claro
            pdf.line(0.5, footerY, pageWidth - 0.5, footerY);

            pdf.setFontSize(6);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont("helvetica", "bold");
            pdf.text("Términos y Condiciones:", 0.5, footerY + 0.15);

            pdf.setFont("helvetica", "normal");
            pdf.text("- Tiempo de entrega: a partir del anticipo.", 0.5, footerY + 0.25);
            pdf.text("- Forma de pago: 50% anticipo, 50% al finalizar satisfacción.", 0.5, footerY + 0.35);
            pdf.text("- Precios sujetos a cambio sin previo aviso.", 0.5, footerY + 0.45);

            // Paginación y Copyright
            pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 0.5, pageHeight - 0.3, { align: "right" });
            pdf.text("MÁXIMA TECNO MULTISERVICIOS | Documento Digital", pageWidth / 2, pageHeight - 0.3, { align: "center" });
        }
    }).save().then(() => {
        // Restaurar estado original
        prepararCamposParaImpresion(false);
        document.querySelectorAll('.no-print').forEach(el => el.style.display = '');
    });
}
