// Importamos la librería de Supabase (es como hacer un import en Java)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Reemplaza estas dos variables con tus datos reales
const supabaseUrl = 'https://gfholzgzawnbpobxlood.supabase.co'; 
const supabaseKey = 'sb_publishable_qihV96ks8iuLKEBcwKgc8g_V9FFIVw5'; // Aquí pegas la clave que empieza con sb_publishable...

// Creamos la instancia principal de la base de datos
export const supabase = createClient(supabaseUrl, supabaseKey);