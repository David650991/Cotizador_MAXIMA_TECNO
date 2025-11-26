document.addEventListener('DOMContentLoaded', iniciar);

// Variables para guardar los datos
let logoBase64 = "";

function iniciar() {
    // 1. Convertir logo a Base64 al inicio para poder usarlo en el PDF después
    convertirLogoABase64();

    setFechas();
    document.getElementById('folio').value = generarFolio();
    agregarFila();

    document.getElementById('agregar').addEventListener('click', agregarFila);
    document.getElementById('descargarPDF').addEventListener('click', generarPDFProfesional);
    document.getElementById('fecha').addEventListener('change', actualizarVigencia);
}

// Convierte la imagen del DOM a Base64 para que jsPDF pueda estamparla en cada hoja
function convertirLogoABase64() {
    const img = document.getElementById('img-logo');
    if (img) {
        // Creamos un canvas temporal
        const canvas = document.createElement("canvas");
        canvas.width = img.width || 130; // Ancho aproximado si no ha cargado
        canvas.height = img.height || 130;
        const ctx = canvas.getContext("2d");

        // Esperamos a que cargue si no lo ha hecho
        if (img.complete) {
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height);
            logoBase64 = canvas.toDataURL("image/png");
        } else {
            img.onload = function () {
                ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height);
                logoBase64 = canvas.toDataURL("image/png");
            };
        }
    }
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
        <td><input type="number" class="precio" value="0" step="0.50" placeholder="Precio Final"></td>
        <td style="text-align: right;"><span class="imp">$0.00</span></td>
        <td class="no-print" style="text-align: center;"><button class="del" style="color:white; background:#dc3545; border:none; border-radius:4px; width:20px; height:20px; cursor:pointer;">x</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('.qty').addEventListener('input', calcular);
    tr.querySelector('.precio').addEventListener('input', calcular);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); calcular(); });
    calcular();
}

// --- CÁLCULO INVERSO DE IMPUESTOS (Tu requerimiento) ---
function calcular() {
    let granTotal = 0; // Suma de todos los importes con IVA

    document.querySelectorAll('#tbody-productos tr').forEach(tr => {
        const q = parseFloat(tr.querySelector('.qty').value) || 0;
        const p = parseFloat(tr.querySelector('.precio').value) || 0; // Precio YA CON IVA
        const imp = q * p;

        tr.querySelector('.imp').textContent = formatear(imp);
        granTotal += imp;
    });

    // Fórmula fiscal correcta para México: Total / 1.16
    const subtotal = granTotal / 1.16;
    const iva = granTotal - subtotal;

    document.getElementById('subtotal').textContent = formatear(subtotal);
    document.getElementById('iva').textContent = formatear(iva);
    document.getElementById('total').textContent = formatear(granTotal);
}

function formatear(n) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

// --- GENERACIÓN PDF MULTIPÁGINA PROFESIONAL ---
function generarPDFProfesional() {
    const folio = document.getElementById('folio').value;

    // Ocultamos los botones antes de generar
    document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');

    // Seleccionamos SOLO el cuerpo (sin header ni footer visuales del HTML, los agregaremos manualmente)
    // Pero para que el diseño fluya bien, tomaremos el contenedor principal
    // y usaremos "márgenes" en blanco para pintar encima el header repetido.

    // Estrategia: Imprimir solo el DIV de contenido, dejando margen arriba y abajo
    const element = document.getElementById('contenido-cuerpo');

    const opt = {
        // Margenes: [Arriba, Izq, Abajo, Der] en Pulgadas
        // Dejamos 1.2 pulgadas arriba para el Encabezado y 1.0 abajo para el Pie
        margin: [1.4, 0.4, 1.2, 0.4],
        filename: `Cotizacion_${folio}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 800 }, // windowWidth arregla el PDF en moviles
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generamos el PDF
    html2pdf().from(element).set(opt).toPdf().get('pdf').then(function (pdf) {
        // Aquí tenemos el objeto PDF crudo. Vamos a pintar en CADA página.
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i); // Nos situamos en la página i

            // --- 1. PINTAR ENCABEZADO (Header) ---
            // Logo (Si cargó correctamente)
            if (logoBase64) {
                // (imagen, formato, x, y, ancho, alto) en pulgadas
                pdf.addImage(logoBase64, 'PNG', 0.4, 0.3, 1.2, 0.5);
            }

            // Texto Empresa (Alineado a la derecha)
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(0, 68, 129); // Azul corporativo
            pdf.text("MÁXIMA TECNO MULTISERVICIOS", pageWidth - 0.4, 0.5, { align: "right" });

            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80);
            pdf.text("SOLUCIONES TECNOLÓGICAS CONFIABLES", pageWidth - 0.4, 0.65, { align: "right" });
            pdf.text("Calle Guadalupe Victoria S/N, Col. Patricio Chirinos", pageWidth - 0.4, 0.8, { align: "right" });
            pdf.text("C.P. 95300, Tres Valles, Ver. | Tel: 288 139 69 42", pageWidth - 0.4, 0.9, { align: "right" });

            // Línea separadora azul
            pdf.setDrawColor(0, 68, 129);
            pdf.setLineWidth(0.02);
            pdf.line(0.4, 1.1, pageWidth - 0.4, 1.1);

            // Cintillo Cotización
            pdf.setFillColor(0, 68, 129);
            pdf.rect(0.4, 1.15, pageWidth - 0.8, 0.25, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            // Centrado: ancho página / 2
            pdf.text("COTIZACIÓN DE SERVICIOS", pageWidth / 2, 1.32, { align: "center" });


            // --- 2. PINTAR PIE DE PÁGINA (Footer) ---
            // Posición Y calculada desde abajo (pageHeight - algo)
            let footerY = pageHeight - 1.0;

            pdf.setDrawColor(200, 200, 200);
            pdf.line(0.4, footerY, pageWidth - 0.4, footerY);

            pdf.setFontSize(6);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont("helvetica", "bold");
            pdf.text("Términos y Condiciones:", 0.4, footerY + 0.15);

            pdf.setFont("helvetica", "normal");
            pdf.text("- Tiempo de entrega: a partir del anticipo.", 0.4, footerY + 0.25);
            pdf.text("- Forma de pago: 50% anticipo, 50% al finalizar satisfacción.", 0.4, footerY + 0.35);
            pdf.text("- Precios sujetos a cambio sin previo aviso.", 0.4, footerY + 0.45);

            // Texto final centrado
            pdf.setFontSize(7);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 0.5, pageHeight - 0.3, { align: "right" });
            pdf.text("MÁXIMA TECNO MULTISERVICIOS | Documento Generado Digitalmente", pageWidth / 2, pageHeight - 0.3, { align: "center" });
        }

    }).save().then(() => {
        // Restaurar botones al terminar
        document.querySelectorAll('.no-print').forEach(el => el.style.display = '');
    });
}
