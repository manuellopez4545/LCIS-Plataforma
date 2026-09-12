// Importamos la conexión que acabas de configurar
import { supabase } from './conexion.js';

// Esto es como hacer un document.getElementById en Java o enlazar tus JTextField
const formulario = document.querySelector('form');
const botonSubmit = document.querySelector('button[type="submit"]');

// Aquí agregamos el "ActionListener" al formulario
formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evitamos que la página se recargue al dar clic

    // Cambiamos el texto del botón mientras carga
    botonSubmit.textContent = "Enviando y subiendo archivo...";
    botonSubmit.disabled = true;

    // 1. Capturamos los valores (como si hicieras .getText() en Java)
    const materia = document.getElementById('materia').value;
    const fecha = document.getElementById('fecha_entrega').value;
    const instrucciones = document.getElementById('instrucciones').value;
    
    // Capturamos el archivo físico que seleccionó el cliente
    const archivoInput = document.getElementById('archivo');
    const archivoFisico = archivoInput.files[0];

    try {
        // 2. Subimos el archivo a tu Bucket de Supabase llamado 'trabajos'
        // Le ponemos la fecha actual al nombre para que nunca se repita
        const nombreArchivo = `${Date.now()}_${archivoFisico.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('trabajos')
            .upload(nombreArchivo, archivoFisico);

        if (uploadError) throw uploadError;

        // Pedimos la URL pública para poder descargar el PDF luego desde el panel de admin
        const { data: publicUrlData } = supabase
            .storage
            .from('trabajos')
            .getPublicUrl(nombreArchivo);
        
        const archivoUrl = publicUrlData.publicUrl;

        // 3. Guardamos todo en la base de datos (Tabla 'solicitudes')
        const { error: dbError } = await supabase
            .from('solicitudes')
            .insert([
                { 
                    materia: materia, 
                    fecha_entrega: fecha, 
                    instrucciones: instrucciones, 
                    archivo_url: archivoUrl 
                }
            ]);

        if (dbError) throw dbError;

        // 4. Si todo sale bien, mostramos un mensaje y limpiamos el formulario
        alert("¡Trabajo enviado con éxito! Nos pondremos en contacto pronto.");
        formulario.reset(); 

    } catch (error) {
        console.error("Error del sistema:", error);
        alert("Hubo un error al enviar el trabajo. Revisa la consola.");
    } finally {
        // Devolvemos el botón a la normalidad
        botonSubmit.textContent = "Solicitar Cotización";
        botonSubmit.disabled = false;
    }
});