import { supabase } from './conexion.js';

const tablaMisTrabajos = document.getElementById('lista-mis-trabajos');
const usuarioActivo = localStorage.getItem('usuarioActivo');

if (!usuarioActivo) {
    window.location.href = 'index.html';
}

async function cargarMisTrabajos() {
    try {
        const { data: misSolicitudes, error } = await supabase
            .from('solicitudes')
            .select('*')
            .eq('usuario_cliente', usuarioActivo) 
            .order('fecha_entrega', { ascending: true });

        if (error) throw error;
        tablaMisTrabajos.innerHTML = '';

        if (misSolicitudes.length === 0) {
            tablaMisTrabajos.innerHTML = '<tr><td colspan="5" style="text-align: center;">Aún no has enviado ningún trabajo.</td></tr>';
            return;
        }

        misSolicitudes.forEach(trabajo => {
            const fila = document.createElement('tr');
            const estado = trabajo.estado ? trabajo.estado : 'Pendiente';
            
            let precioFormateado = 'Por cotizar';
            let precioCrudo = 0;
            if (trabajo.precio) {
                precioCrudo = trabajo.precio;
                precioFormateado = "$" + new Intl.NumberFormat('es-CO').format(trabajo.precio);
            }

            // Colores dinámicos
            let colorEstado = '#333';
            if (estado === 'Pendiente') colorEstado = '#d97706'; 
            if (estado === 'Cotizado') colorEstado = '#2563eb'; 
            if (estado === 'Pago en revisión') colorEstado = '#0284c7'; 
            if (estado === 'En Proceso') colorEstado = '#7c3aed'; 
            if (estado === 'Terminado') colorEstado = '#16a34a'; 
            if (estado.includes('Cancelado')) colorEstado = '#ef4444'; 

            let textoEstadoVisual = estado;
            let botonAccionHTML = '';

            if (estado === 'Cancelado por admin') {
                textoEstadoVisual = `No podemos realizar su trabajo.<br><span style="color: #64748b; font-size: 0.85em; font-weight: normal; margin-top: 5px; display: block;"><strong>Motivo:</strong> ${trabajo.motivo_cancelacion || 'No especificado'}</span>`;
            } else if (estado === 'Pendiente') {
                botonAccionHTML = `<button class="btn-cancelar-cliente" data-id="${trabajo.id}" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 0.85em; margin-top: 10px;">Cancelar Solicitud</button>`;
            } else if (estado === 'Cotizado') {
                // AQUÍ AGREGAMOS EL BOTÓN DE PAGAR
                botonAccionHTML = `<button class="btn-abrir-pago" data-id="${trabajo.id}" data-precio="${precioCrudo}" data-precio-formato="${precioFormateado}">Pagar Trabajo</button>`;
            }

            fila.innerHTML = `
                <td><strong>${trabajo.fecha_entrega}</strong></td>
                <td>${trabajo.materia}</td>
                <td>${trabajo.instrucciones}</td>
                <td style="color: ${colorEstado}; font-weight: bold;">
                    ${textoEstadoVisual}
                    ${botonAccionHTML ? '<br>' + botonAccionHTML : ''}
                </td>
                <td><strong>${precioFormateado}</strong></td>
            `;
            tablaMisTrabajos.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar:", error.message);
    }
}

// --- LÓGICA DE CANCELACIÓN (Existente) ---
tablaMisTrabajos.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-cancelar-cliente')) {
        const confirmar = confirm("¿Estás seguro de que deseas cancelar este trabajo?");
        if (!confirmar) return;
        const idTrabajo = e.target.getAttribute('data-id');
        e.target.textContent = "Cancelando...";
        try {
            const { error } = await supabase.from('solicitudes').update({ estado: 'Cancelado por el cliente' }).eq('id', idTrabajo);
            if (error) throw error;
            await cargarMisTrabajos();
        } catch (error) {
            alert("Hubo un error al cancelar.");
        }
    }
});

// --- LÓGICA DEL MODAL DE PAGO ---
const modalPago = document.getElementById('fondo-modal-pago');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const inputArchivoPago = document.getElementById('pago-archivo');
const formPago = document.getElementById('form-pago');
const btnEnviarComprobante = document.getElementById('btn-enviar-comprobante');

// 1. Abrir Modal al darle a "Pagar"
tablaMisTrabajos.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-abrir-pago')) {
        const idTrabajo = e.target.getAttribute('data-id');
        const precioFormato = e.target.getAttribute('data-precio-formato');
        
        document.getElementById('pago-id-trabajo').value = idTrabajo;
        document.getElementById('pago-monto').value = precioFormato;
        document.getElementById('pago-nombre-archivo').textContent = "Formatos: JPG, PNG, PDF";
        inputArchivoPago.value = "";
        
        modalPago.style.display = 'flex';
    }
});

// 2. Cerrar Modal
btnCerrarModal.addEventListener('click', () => modalPago.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modalPago) modalPago.style.display = 'none'; });

// 3. Mostrar nombre del archivo seleccionado
inputArchivoPago.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        document.getElementById('pago-nombre-archivo').textContent = "Seleccionado: " + e.target.files[0].name;
    }
});

// 4. Subir comprobante y actualizar Supabase
formPago.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idTrabajo = document.getElementById('pago-id-trabajo').value;
    const archivo = inputArchivoPago.files[0];

    btnEnviarComprobante.textContent = "Subiendo y enviando...";
    btnEnviarComprobante.disabled = true;

    try {
        // Subir a Storage
        const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const nombreArchivo = `pago_${Date.now()}_${nombreLimpio}`;
        
        const { error: uploadError } = await supabase.storage.from('comprobantes').upload(nombreArchivo, archivo);
        if (uploadError) throw uploadError;

        // Obtener URL
        const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(nombreArchivo);
        
        // Actualizar Base de Datos (Estado y URL)
        const { error: updateError } = await supabase
            .from('solicitudes')
            .update({ 
                estado: 'Pago en revisión', 
                comprobante_url: urlData.publicUrl 
            })
            .eq('id', idTrabajo);

        if (updateError) throw updateError;

        alert("¡Comprobante enviado con éxito! Un administrador lo revisará pronto.");
        modalPago.style.display = 'none';
        await cargarMisTrabajos();

    } catch (error) {
        console.error("Error al pagar:", error);
        alert("Hubo un error al procesar el pago.");
    } finally {
        btnEnviarComprobante.textContent = "Enviar solicitud";
        btnEnviarComprobante.disabled = false;
    }
});

cargarMisTrabajos();