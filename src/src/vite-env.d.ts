   /// <reference types="vite/client" />

   interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    // legg til flere om du har flere env-variabler
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }