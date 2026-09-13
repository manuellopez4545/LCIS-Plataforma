import { supabase } from './conexion.js';

const formRecuperar = document.getElementById('form-recuperar');
const btnEnviar = document.querySelector('button[type="submit"]');

formRecuperar.addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = document.getElementById('correo-recuperacion').value;
    
    btnEnviar.textContent = "Enviando...";
    btnEnviar.disabled = true;

    try {
        // Supabase genera y envía el correo automáticamente
        const { data, error } = await supabase.auth.resetPasswordForEmail(correo);

        if (error) throw error;

        alert("Si el correo está registrado en nuestro sistema, recibirás un mensaje con las instrucciones en breve.");
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error al solicitar recuperación:", error.message);
        alert("Hubo un error al procesar la solicitud. Intenta de nuevo más tarde.");
    } finally {
        btnEnviar.textContent = "Enviar instrucciones";
        btnEnviar.disabled = false;
    }
});