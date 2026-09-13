import { supabase } from './conexion.js';

// --- GUARDIÁN DE SEGURIDAD (Protección de Ruta) ---
const usuarioActual = localStorage.getItem('usuarioActivo');

if (!usuarioActual) {
    // Si no hay nadie en memoria, lo pateamos al login de administradores
    window.location.href = 'acceso-admin.html';
} else {
    // Si hay alguien, verificamos en la base de datos si realmente es un administrador aprobado
    const { data: userData, error } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('correo', usuarioActual) 
        .single();

    if (error || userData.rol !== 'admin') {
        alert("Acceso denegado: No tienes privilegios de administrador o tu cuenta aún no ha sido aprobada.");
        // Asegúrate de que esto diga 'acceso-admin.html' y NO 'index.html'
        window.location.href = 'acceso-admin.html';
    }
}
// --------------------------------------------------
// --- CERRAR SESIÓN ADMIN ---
document.getElementById('btn-cerrar-admin').addEventListener('click', async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('usuarioActivo');
    localStorage.removeItem('modoAcceso');
    window.location.href = 'acceso-admin.html';
});

const tablaTrabajos = document.getElementById('lista-trabajos');

async function cargarTrabajos() {
    try {
        const { data: solicitudes, error } = await supabase
            .from('solicitudes')
            .select('*')
            .order('fecha_entrega', { ascending: true });

        if (error) throw error;
        tablaTrabajos.innerHTML = '';

        if (solicitudes.length === 0) {
            tablaTrabajos.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay trabajos pendientes</td></tr>';
            return;
        }

        solicitudes.forEach(trabajo => {
            const fila = document.createElement('tr');
            const estadoActual = trabajo.estado ? trabajo.estado : 'Pendiente';
            
            let precioFormateado = '';
            if (trabajo.precio) precioFormateado = "$" + new Intl.NumberFormat('es-CO').format(trabajo.precio);

            let opcionesSelect = `
                <option value="Pendiente" ${estadoActual === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                <option value="Cotizado" ${estadoActual === 'Cotizado' ? 'selected' : ''}>Cotizado</option>
                <option value="En Proceso" ${estadoActual === 'En Proceso' ? 'selected' : ''}>En Proceso</option>
                <option value="Terminado" ${estadoActual === 'Terminado' ? 'selected' : ''}>Terminado</option>
                <option value="Cancelado por admin" ${estadoActual === 'Cancelado por admin' ? 'selected' : ''}>Cancelar Trabajo</option>
            `;
            
            if (estadoActual === 'Cancelado por el cliente') {
                opcionesSelect += `<option value="Cancelado por el cliente" selected>Cancelado por el cliente</option>`;
            }

            // Lógica para mostrar el botón de eliminar solo en estados cancelados
            let botonEliminarHTML = '';
            if (estadoActual === 'Cancelado por el cliente' || estadoActual === 'Cancelado por admin') {
                botonEliminarHTML = `<button class="btn-eliminar" data-id="${trabajo.id}" style="background-color: #ef4444; color: white; border: none; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9em; width: 100%; margin-top: 10px; transition: background 0.2s;">Eliminar Registro</button>`;
            }

            fila.innerHTML = `
                <td><strong>${trabajo.fecha_entrega}</strong></td>
                <td>${trabajo.materia}</td>
                <td>${trabajo.instrucciones}</td>
                <td><a href="${trabajo.archivo_url}" target="_blank" rel="noopener noreferrer" class="enlace-descarga">Descargar</a></td>
                <td>
                    <select class="select-estado" data-id="${trabajo.id}" id="estado-${trabajo.id}" style="${estadoActual === 'Cancelado por el cliente' ? 'border-color: #ef4444; color: #ef4444; font-weight: bold;' : ''}">
                        ${opcionesSelect}
                    </select>
                    
                    <div id="contenedor-input-${trabajo.id}" style="display: ${estadoActual === 'Pendiente' ? 'block' : 'none'};">
                        <input type="text" id="precio-${trabajo.id}" class="input-precio" placeholder="Valor (Ej: $50.000)" value="${precioFormateado}">
                    </div>

                    <div id="contenedor-motivo-${trabajo.id}" style="display: ${estadoActual === 'Cancelado por admin' ? 'block' : 'none'}; margin-bottom: 10px;">
                        <textarea id="motivo-${trabajo.id}" class="input-precio" placeholder="Escribe el motivo de la cancelación..." rows="2" style="resize: vertical;">${trabajo.motivo_cancelacion || ''}</textarea>
                    </div>

                    <div id="contenedor-texto-${trabajo.id}" style="display: ${(estadoActual !== 'Pendiente' && estadoActual !== 'Cancelado por admin') ? 'block' : 'none'}; margin-bottom: 10px;">
                        <strong>Valor:</strong> <span id="valor-fijo-${trabajo.id}">${precioFormateado || 'N/A'}</span>
                    </div>

                    <button class="btn-guardar" data-id="${trabajo.id}" style="width: 100%; padding: 10px 12px; border: none; border-radius: 6px; background-color: #2563eb; color: white; cursor: pointer; font-size: 0.9em;">Guardar Cambios</button>
                    
                    <!-- Inyección dinámica del botón de eliminar -->
                    ${botonEliminarHTML}
                </td>
            `;
            tablaTrabajos.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar:", error);
    }
}

// Formato de moneda
tablaTrabajos.addEventListener('input', (e) => {
    if (e.target.classList.contains('input-precio') && e.target.tagName === 'INPUT') {
        let valorNumerico = e.target.value.replace(/\D/g, "");
        e.target.value = valorNumerico === "" ? "" : "$" + new Intl.NumberFormat('es-CO').format(valorNumerico);
    }
});

// Interfaz dinámica al cambiar el select
tablaTrabajos.addEventListener('change', (e) => {
    if (e.target.classList.contains('select-estado')) {
        const id = e.target.getAttribute('data-id');
        const estado = e.target.value;
        
        document.getElementById(`contenedor-input-${id}`).style.display = (estado === 'Pendiente') ? 'block' : 'none';
        document.getElementById(`contenedor-motivo-${id}`).style.display = (estado === 'Cancelado por admin') ? 'block' : 'none';
        
        const mostrarTexto = (estado !== 'Pendiente' && estado !== 'Cancelado por admin');
        document.getElementById(`contenedor-texto-${id}`).style.display = mostrarTexto ? 'block' : 'none';
        
        if (mostrarTexto) {
            document.getElementById(`valor-fijo-${id}`).textContent = document.getElementById(`precio-${id}`).value || 'N/A';
        }
    }
});

// Lógica de botones (Guardar y Eliminar)
tablaTrabajos.addEventListener('click', async (e) => {
    
    // --- LÓGICA: GUARDAR CAMBIOS ---
    if (e.target.classList.contains('btn-guardar')) {
        const id = e.target.getAttribute('data-id');
        const estado = document.getElementById(`estado-${id}`).value;
        const inputPrecio = document.getElementById(`precio-${id}`);
        const inputMotivo = document.getElementById(`motivo-${id}`);
        
        let datosAActualizar = { estado: estado };
        
        if (estado === 'Cotizado' || estado === 'En Proceso' || estado === 'Terminado') {
            if (!inputPrecio.value) {
                alert("Digita el valor de la cotización antes de cambiar el estado.");
                return;
            }
            const valorLimpio = inputPrecio.value.replace(/\D/g, "");
            datosAActualizar.precio = valorLimpio ? Number(valorLimpio) : null;
        }

        if (estado === 'Cancelado por admin') {
            if (!inputMotivo.value.trim()) {
                alert("Debes escribir un motivo para cancelar el trabajo.");
                return;
            }
            datosAActualizar.motivo_cancelacion = inputMotivo.value.trim();
        }

        e.target.textContent = "Guardando...";
        e.target.disabled = true;

        try {
            const { error } = await supabase.from('solicitudes').update(datosAActualizar).eq('id', id);
            if (error) throw error;
            await cargarTrabajos(); 
        } catch (error) {
            console.error("Error:", error.message);
            alert("Hubo un error al guardar.");
            e.target.textContent = "Guardar Cambios";
            e.target.disabled = false;
        }
    }

    // --- LÓGICA: ELIMINAR REGISTRO ---
    if (e.target.classList.contains('btn-eliminar')) {
        const confirmar = confirm("¿Estás seguro de que deseas eliminar este trabajo permanentemente? Esta acción destruirá el registro en la base de datos y no se puede deshacer.");
        if (!confirmar) return;

        const id = e.target.getAttribute('data-id');
        e.target.textContent = "Eliminando...";
        e.target.disabled = true;

        try {
            // Utilizamos el método .delete() de Supabase apuntando al ID exacto
            const { error } = await supabase.from('solicitudes').delete().eq('id', id);
            if (error) throw error;
            
            alert("Registro eliminado exitosamente.");
            await cargarTrabajos(); 
        } catch (error) {
            console.error("Error al eliminar:", error.message);
            alert("Hubo un error al eliminar el registro.");
            e.target.textContent = "Eliminar Registro";
            e.target.disabled = false;
        }
    }
});

cargarTrabajos();
// ==========================================
// MÓDULO DE GESTIÓN DE ADMINISTRADORES
// ==========================================
const tablaPendientes = document.getElementById('lista-pendientes');

async function cargarPendientes() {
    try {
        // Buscamos a los que tienen el rol 'admin_pendiente'
        const { data: pendientes, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('rol', 'admin_pendiente')
            .order('created_at', { ascending: false });

        if (error) throw error;
        tablaPendientes.innerHTML = '';

        if (pendientes.length === 0) {
            tablaPendientes.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #64748b;">No hay solicitudes pendientes de aprobación.</td></tr>';
            return;
        }

        pendientes.forEach(usuario => {
            const fila = document.createElement('tr');
            
            // Formateamos la fecha para que se vea legible
            const fechaSolicitud = new Date(usuario.created_at).toLocaleDateString('es-CO');

            fila.innerHTML = `
                <td>
                    <strong>${usuario.correo}</strong><br>
                    <span style="font-size: 0.85em; color: #64748b;">Alias: ${usuario.alias}</span>
                </td>
                <td>${fechaSolicitud}</td>
                <td>
                    <button class="btn-aprobar-admin" data-id="${usuario.id}" style="background-color: #16a34a; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-right: 10px; font-weight: bold; transition: background 0.2s;">Aprobar</button>
                    <button class="btn-rechazar-admin" data-id="${usuario.id}" style="background-color: #ef4444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background 0.2s;">Rechazar</button>
                </td>
            `;
            tablaPendientes.appendChild(fila);
        });

    } catch (error) {
        console.error("Error al cargar pendientes:", error.message);
        tablaPendientes.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error al cargar las solicitudes.</td></tr>';
    }
}

// Lógica para los botones de Aprobar y Rechazar
tablaPendientes.addEventListener('click', async (e) => {
    const idUsuario = e.target.getAttribute('data-id');

    // --- APROBAR ADMINISTRADOR ---
    if (e.target.classList.contains('btn-aprobar-admin')) {
        e.target.textContent = "Aprobando...";
        e.target.disabled = true;

        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ rol: 'admin' }) // Le quitamos el "pendiente" y le damos el pase maestro
                .eq('id', idUsuario);

            if (error) throw error;
            
            alert("¡Compañero aprobado! Ya puede iniciar sesión en el panel.");
            await cargarPendientes(); 
        } catch (error) {
            console.error("Error al aprobar:", error.message);
            alert("Hubo un error al aprobar al usuario.");
            e.target.textContent = "Aprobar";
            e.target.disabled = false;
        }
    }

    // --- RECHAZAR ADMINISTRADOR ---
    if (e.target.classList.contains('btn-rechazar-admin')) {
        const confirmar = confirm("¿Rechazar esta solicitud? Se eliminará permanentemente.");
        if (!confirmar) return;

        e.target.textContent = "Rechazando...";
        e.target.disabled = true;

        try {
            // Si lo rechazamos, borramos su intento de registro de la tabla
            const { error } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', idUsuario);

            if (error) throw error;
            
            alert("Solicitud rechazada y eliminada.");
            await cargarPendientes(); 
        } catch (error) {
            console.error("Error al rechazar:", error.message);
            alert("Hubo un error al rechazar la solicitud.");
            e.target.textContent = "Rechazar";
            e.target.disabled = false;
        }
    }
});

// Arrancamos la carga inicial de la tabla de pendientes
cargarPendientes();