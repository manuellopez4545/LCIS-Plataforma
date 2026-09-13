import { supabase } from './conexion.js';

const formRegNormal = document.getElementById('form-reg-normal');
const formRegAnon = document.getElementById('form-reg-anon');

// --- VALIDADOR MAESTRO DE DUPLICADOS ---
async function verificarAliasDuplicado(alias) {
    const { data } = await supabase
        .from('usuarios')
        .select('alias')
        .eq('alias', alias)
        .maybeSingle();
    
    return data !== null; // Retorna true si ya existe en la base de datos
}

// --- 1. LÓGICA DE REGISTRO NORMAL ---
formRegNormal.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formRegNormal.querySelector('button');
    
    const correo = document.getElementById('reg-correo').value.trim();
    const alias = document.getElementById('reg-alias-normal').value.trim();
    const telefono = document.getElementById('reg-telefono').value.trim();
    const password = document.getElementById('reg-password').value;

    btn.textContent = "Verificando...";
    btn.disabled = true;

    try {
        // 1. Verificamos que el alias no esté repetido
        const aliasOcupado = await verificarAliasDuplicado(alias);
        if (aliasOcupado) {
            alert(`⚠️ El alias o nombre "${alias}" ya se encuentra en uso. Por favor, elige otro.`);
            btn.textContent = "Completar Registro";
            btn.disabled = false;
            return;
        }

        // 2. Guardamos en el motor de autenticación
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: correo,
            password: password
        });
        if (authError) throw authError;

        // 3. Guardamos los datos completos (incluyendo tu teléfono) en la tabla pública
        const { error: dbError } = await supabase.from('usuarios').insert([{ 
            correo: correo, 
            alias: alias, 
            telefono: telefono,
            es_anonimo: false,
            rol: 'cliente' 
        }]);
        if (dbError) throw dbError;

        alert("¡Registro exitoso! Ya puedes iniciar sesión con tu correo y contraseña.");
        window.location.href = 'index.html';

    } catch (error) {
        console.error("Error:", error.message);
        alert("Hubo un error en el registro. Es probable que el correo ya esté registrado.");
        btn.textContent = "Completar Registro";
        btn.disabled = false;
    }
});

// --- 2. LÓGICA DE REGISTRO ANÓNIMO ---
formRegAnon.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formRegAnon.querySelector('button');
    const alias = document.getElementById('reg-alias-anon').value.trim();

    if (alias.includes('@')) {
        alert("Los alias anónimos no pueden contener un '@'.");
        return;
    }

    btn.textContent = "Creando...";
    btn.disabled = true;

    try {
        // 1. Verificamos que el alias no esté repetido
        const aliasOcupado = await verificarAliasDuplicado(alias);
        if (aliasOcupado) {
            alert(`⚠️ El alias "${alias}" ya se encuentra en uso. Por favor, elige otro.`);
            btn.textContent = "Crear Cuenta Anónima";
            btn.disabled = false;
            return;
        }

        // 2. Guardamos directamente en la tabla (sin Auth, porque no tiene correo)
        const { error: insertError } = await supabase.from('usuarios').insert([{ 
            alias: alias, 
            es_anonimo: true,
            rol: 'cliente' 
        }]);
        if (insertError) throw insertError;

        alert(`¡Cuenta anónima creada! Bienvenido, ${alias}.`);
        
        // Le damos acceso directo para mejor experiencia de usuario
        localStorage.setItem('usuarioActivo', alias);
        localStorage.setItem('modoAcceso', 'anonimo');
        window.location.href = 'cliente.html';

    } catch (error) {
        console.error("Error:", error.message);
        alert("Hubo un error al crear la cuenta anónima.");
        btn.textContent = "Crear Cuenta Anónima";
        btn.disabled = false;
    }
});