import { supabase } from './conexion.js';

const formulario = document.querySelector('form');
const botonSubmit = document.querySelector('button[type="submit"]');

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); 

    botonSubmit.textContent = "Enviando y subiendo archivo...";
    botonSubmit.disabled = true;

    try {
        // 1. Capturamos los valores DENTRO del try para evitar limbos
        // Asegúrate de que los IDs coincidan exactamente con tu HTML
        const materiaValor = document.getElementById('materia').value;
        const fechaValor = document.getElementById('fecha_entrega').value; 
        const instruccionesValor = document.getElementById('instrucciones').value;
        
        const archivoInput = document.getElementById('archivo');
        const archivoFisico = archivoInput.files[0];

        // 2. Subimos el archivo a Supabase
        const nombreLimpio = archivoFisico.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const nombreArchivo = `${Date.now()}_${nombreLimpio}`;
        
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('trabajos')
            .upload(nombreArchivo, archivoFisico);

        if (uploadError) throw uploadError;

        // Pedimos la URL pública
        const { data: publicUrlData } = supabase
            .storage
            .from('trabajos')
            .getPublicUrl(nombreArchivo);
        
        const archivoUrl = publicUrlData.publicUrl;

        // 3. Guardamos todo en la base de datos
        const usuarioActual = localStorage.getItem('usuarioActivo');

        const { error: insertError } = await supabase
            .from('solicitudes')
            .insert([
                { 
                    materia: materiaValor, 
                    instrucciones: instruccionesValor, 
                    archivo_url: archivoUrl, 
                    fecha_entrega: fechaValor,
                    usuario_cliente: usuarioActual 
                }
            ]);

        if (insertError) throw insertError;

        // 4. Éxito
        alert("¡Trabajo enviado con éxito! Nos pondremos en contacto pronto.");
        formulario.reset(); 

    } catch (error) {
        // Si algo falla, ahora sí lo atrapará y te lo mostrará
        console.error("Error del sistema:", error);
        alert("Hubo un error al enviar el trabajo. Revisa la consola (F12) para más detalles.");
    } finally {
        botonSubmit.textContent = "Solicitar Cotización";
        botonSubmit.disabled = false;
    }
});