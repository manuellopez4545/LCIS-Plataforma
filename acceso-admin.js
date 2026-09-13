import { supabase } from './conexion.js';

const formAdmin = document.getElementById('form-admin');
const btnEntrar = document.getElementById('btn-entrar');
const btnSolicitar = document.getElementById('btn-solicitar');

const correoInput = document.getElementById('correo-admin');
const passInput = document.getElementById('password-admin');

// --- LÓGICA PARA INICIAR SESIÓN ---
formAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnEntrar.textContent = "Verificando...";
    btnEntrar.disabled = true;

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: correoInput.value,
            password: passInput.value
        });

        if (authError) throw authError;

        // Verificamos su rol en tu tabla usuarios
        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('correo', correoInput.value)
            .single();

        if (userError || !userData) throw new Error("No se encontraron tus datos en el sistema.");

        if (userData.rol === 'admin') {
            // ¡Es un admin válido!
            localStorage.setItem('usuarioActivo', correoInput.value);
            localStorage.setItem('modoAcceso', 'admin');
            window.location.href = 'admin.html';
        } else if (userData.rol === 'admin_pendiente') {
            alert("Tu solicitud para ser administrador sigue en revisión. Contacta a un administrador activo para que apruebe tu cuenta.");
            await supabase.auth.signOut();
        } else {
            alert("Esta cuenta pertenece a un cliente, no a un administrador.");
            await supabase.auth.signOut();
        }

    } catch (error) {
        console.error("Error:", error.message);
        alert("Credenciales incorrectas o usuario no encontrado.");
    } finally {
        btnEntrar.textContent = "Iniciar Sesión";
        btnEntrar.disabled = false;
    }
});

// --- LÓGICA PARA SOLICITAR SER ADMINISTRADOR ---
btnSolicitar.addEventListener('click', async () => {
    const correo = correoInput.value;
    const password = passInput.value;

    if (!correo || !password) {
        alert("Por favor, llena el correo y la contraseña que deseas usar para enviar tu solicitud.");
        return;
    }

    btnSolicitar.textContent = "Enviando solicitud...";
    btnSolicitar.disabled = true;

    try {
        // 1. Lo registramos en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: correo,
            password: password
        });

        if (authError) throw authError;

        // 2. Lo guardamos en tu tabla usuarios con el rol bloqueado
        const { error: dbError } = await supabase
            .from('usuarios')
            .insert([
                { 
                    correo: correo,
                    alias: correo.split('@')[0], // Usamos la primera parte del correo como alias por defecto
                    es_anonimo: false,
                    rol: 'admin_pendiente' // <--- LA CLAVE DEL SISTEMA DE APROBACIÓN
                }
            ]);

        if (dbError) throw dbError;

        alert("Solicitud enviada correctamente. No podrás iniciar sesión hasta que el Administrador Principal apruebe tu cuenta.");
        formAdmin.reset();

    } catch (error) {
        console.error("Error:", error.message);
        alert("Error al enviar la solicitud. Es posible que el correo ya esté registrado.");
    } finally {
        btnSolicitar.textContent = "Solicitar acceso como administrador";
        btnSolicitar.disabled = false;
    }
});