// Configuration publique de SPREZZA.
// La clé « anon » Supabase est conçue pour être publique : la sécurité repose sur les règles RLS
// (chaque utilisateur ne voit que ses propres lignes et photos). Ne jamais mettre ici la clé « service_role ».
export const SYNC_CONFIG = {
  url: '', // ex. https://abcdefghijkl.supabase.co
  anonKey: '',
};
