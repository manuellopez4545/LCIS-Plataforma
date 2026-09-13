import { supabase } from './conexion.js';

// --- CONTROL DE LA INTERFAZ (PESTAÑAS) ---
const tabNormal = document.getElementById('tab-normal');
const tabAnonimo = document.getElementById('tab-anonimo');
const formNormal = document.getElementById('form-normal');
const formAnonimo = document.getElementById('form-anonimo');

// Asumiendo que agregaste las clases visuales active-blue y active-green en index.html
tabNormal.addEventListener('click', () => {
    tabNormal.classList.add('active-blue');
    tabAnonimo.classList.remove('active-green');
    formNormal.style.display = 'block';
    formAnonimo.style.display = 'none';
});

tabAnonimo.addEventListener('click', () => {
    tabAnonimo.classList.add('active-green');
    tabNormal.classList.remove('active-blue');
    formAnonimo.style.display = 'block';
    formNormal.style.display = 'none';
});

// --- DETECTOR DE RECUPERACIÓN DE CONTRASEÑA ---
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') window.location.href = 'nueva-password.html';
});

// --- 1. LÓGICA DE LOGIN NORMAL ---
formNormal.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formNormal.querySelector('button');
    const usuario = document.getElementById('usuario-normal').value.trim();
    const password = document.getElementById('password-normal').value;

    btn.textContent = "Verificando...";
    btn.disabled = true;

    try {
        let emailParaLogin = usuario;

        // Si el usuario NO escribió un '@', asumimos que escribió su Alias
        if (!usuario.includes('@')) {
            // Usamos .ilike() en lugar de .eq() para ignorar mayúsculas y minúsculas
            const { data: userData, error: userError } = await supabase
                .from('usuarios')
                .select('correo, es_anonimo')
                .ilike('alias', usuario) 
                .maybeSingle();

            if (userError || !userData) {
                alert("No se encontró ninguna cuenta registrada con ese alias.");
                btn.textContent = "Iniciar Sesión";
                btn.disabled = false;
                return;
            }

            // Validamos que no intente entrar a una cuenta anónima por aquí
            if (userData.es_anonimo === true) {
                alert("⚠️ Este alias pertenece a una cuenta anónima (sin contraseña). Usa la pestaña 'Acceso Anónimo'.");
                btn.textContent = "Iniciar Sesión";
                btn.disabled = false;
                return;
            }

            // Si todo está bien, extraemos el correo asociado a ese alias en la base de datos
            emailParaLogin = userData.correo; 
        }

        // Finalmente, iniciamos sesión en Supabase con el correo (sea el que escribió o el que sacamos del alias)
        const { error } = await supabase.auth.signInWithPassword({
            email: emailParaLogin,
            password: password
        });

        if (error) throw error;

        // Recuperamos el alias real para guardarlo en la memoria del navegador
        const { data: userDataFinal } = await supabase
            .from('usuarios')
            .select('alias')
            .eq('correo', emailParaLogin)
            .maybeSingle();
        
        localStorage.setItem('usuarioActivo', userDataFinal ? userDataFinal.alias : emailParaLogin);
        localStorage.setItem('modoAcceso', 'normal');
        
        // ¡Éxito! Lo mandamos a su panel
        window.location.href = 'cliente.html';

    } catch (error) {
        console.error("Error:", error.message);
        alert("Credenciales incorrectas. Verifica tu contraseña.");
        btn.textContent = "Iniciar Sesión";
        btn.disabled = false;
    }
});
// --- 2. LÓGICA DE LOGIN ANÓNIMO (Estricto: Solo deja entrar si ya existe) ---
formAnonimo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formAnonimo.querySelector('button');
    const alias = document.getElementById('alias-anonimo').value.trim();

    if (alias.includes('@')) {
        alert("Los alias anónimos no pueden contener '@'.");
        return;
    }

    btn.textContent = "Buscando usuario...";
    btn.disabled = true;

    try {
        // 1. Buscamos el alias en la base de datos
        const { data: userData, error: searchError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('alias', alias)
            .maybeSingle(); // maybeSingle devuelve los datos o 'null' si no existe

        // 2. Si no existe en la base de datos, lo bloqueamos y le pedimos que se registre
        if (!userData) {
            alert(`⚠️ El usuario "${alias}" no se encuentra registrado. Por favor, ve a la página de "Regístrate aquí" y crea tu cuenta anónima primero.`);
            btn.textContent = "Ingresar Anónimamente";
            btn.disabled = false;
            return;
        }

        // 3. Si existe, pero descubrimos que es una cuenta normal (con correo/contraseña), lo bloqueamos
        if (userData.es_anonimo === false) {
            alert(`⚠️ El usuario "${alias}" es una cuenta normal. Por favor, usa la pestaña "Usuario Registrado" e ingresa tu contraseña.`);
            btn.textContent = "Ingresar Anónimamente";
            btn.disabled = false;
            return;
        }

        // 4. Si pasó todos los filtros (existe y es cuenta anónima), le damos acceso al portal
        localStorage.setItem('usuarioActivo', alias);
        localStorage.setItem('modoAcceso', 'anonimo');
        window.location.href = 'cliente.html';

    } catch (error) {
        console.error("Error:", error.message);
        alert("Hubo un problema al conectar con el servidor.");
        btn.textContent = "Ingresar Anónimamente";
        btn.disabled = false;
    }
});