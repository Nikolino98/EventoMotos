import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeDatabase } from './integrations/supabase/init-db';

// Inicializar la base de datos
initializeDatabase()
  .then(result => {
    if (result.success) {
      console.log('Base de datos inicializada correctamente');
    } else {
      console.error('Error al inicializar la base de datos:', result.error);
    }
  });

createRoot(document.getElementById("root")!).render(<App />);
