import { supabase } from './conexion.js';

const form = document.getElementById('form-nueva-password');
const btnGuardar = document.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevaPass = document.getElementById('nueva-pass').value;
    
    btnGuardar.textContent = "Guardando...";
    btnGuardar.disabled = true;

    try {
        // Actualizamos la contraseña del usuario en la base de datos
        const { error } = await supabase.auth.updateUser({ password: nuevaPass });

        if (error) throw error;

        alert("¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva clave.");
        
        // Por seguridad, cerramos la sesión temporal que abrió el correo
        await supabase.auth.signOut();
        
        // Lo devolvemos a la pantalla de inicio para que entre normalmente
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error al actualizar contraseña:", error.message);
        alert("Hubo un error al guardar. Intenta solicitar el correo de recuperación otra vez.");
        
        btnGuardar.textContent = "Guardar Contraseña";
        btnGuardar.disabled = false;
    }
});
