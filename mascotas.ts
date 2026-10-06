import { supabase } from '@/src/lib/supabaseClient';

export async function obtenerMascotas() {
  const { data, error } = await supabase.from('mascotas').select('*');

  if (error) {
    console.error('Error cargando mascotas:', error.message);
    return [];
  }

  return data ?? [];
}
