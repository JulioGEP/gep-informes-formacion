# Manual de despliegue

## Configuración de autenticación por token

La aplicación utiliza un flujo de autenticación basado en tokens corporativos. Las credenciales válidas se definen mediante una variable de entorno que Netlify inyecta en el build (`VITE_AUTHORIZED_USERS`). Cada par `correo:token` habilita el acceso a una persona usuaria.

### Alta o edición de usuarios autorizados

1. Accede a Netlify y selecciona el sitio correspondiente.
2. Entra en **Site settings → Build & deploy → Environment → Environment variables**.
3. Crea o edita la variable `VITE_AUTHORIZED_USERS` con el formato:

   ```text
   persona1@empresa.com:token-seguro-1,persona2@empresa.com:token-seguro-2
   ```

   - Se admiten comas, punto y coma o saltos de línea como separadores entre credenciales.
   - Los correos no distinguen mayúsculas/minúsculas, pero los tokens sí.
4. Guarda los cambios y despliega nuevamente el sitio para que Vite recompile con los nuevos valores. Un _trigger_ manual de deploy desde **Deploys → Trigger deploy → Deploy site** es suficiente.
5. Comunica el token asignado a cada persona por un canal seguro.

### Revocación de tokens

1. Sigue los pasos anteriores hasta el paso 2.
2. Elimina el par `correo:token` correspondiente o reemplaza el token por uno nuevo.
3. Guarda la variable y vuelve a desplegar la aplicación para invalidar sesiones futuras. El cierre de sesión es inmediato porque los tokens ya no coincidirán con el valor almacenado en Netlify.
4. Si necesitas cerrar sesiones activas, solicita a la persona usuaria que pulse **Cerrar sesión** o elimina manualmente los datos de sesión desde las herramientas del navegador.

> **Nota:** Netlify oculta el valor de la variable tras guardarla. Para rotar un token, vuelve a introducir toda la lista de credenciales y asegúrate de almacenarla en un gestor seguro.
