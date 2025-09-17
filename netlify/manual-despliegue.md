# Manual de despliegue

## Configuración de autenticación por token

La aplicación se protege mediante tokens sensibles a mayúsculas que se validan en el navegador. El valor incorporado por defecto en el código es `GEP_Group112`, pero puedes definir los tuyos mediante la variable de entorno `VITE_AUTHORIZED_USERS`.

El valor admite múltiples formatos para adaptarse a tus preferencias:

- Lista separada por comas, puntos y coma o saltos de línea (`TOKEN_1,TOKEN_2`).
- Cadena JSON con un array de tokens (`["TOKEN_1", "TOKEN_2"]`).
- Objeto JSON cuyas claves o valores contengan tokens (por ejemplo, `{ "user1": "TOKEN_1" }`).

### Registrar o actualizar tokens en Netlify

1. Accede a Netlify y selecciona el sitio correspondiente.
2. Entra en **Site settings → Build & deploy → Environment → Environment variables**.
3. Crea o edita la variable `VITE_AUTHORIZED_USERS` con los tokens válidos (uno por línea o separados por comas si prefieres copiar/pegar desde un editor).
4. Guarda los cambios y despliega nuevamente el sitio para que Vite recompile con los nuevos valores. Un _trigger_ manual de deploy desde **Deploys → Trigger deploy → Deploy site** es suficiente.
5. Comunica los tokens asignados al equipo autorizado por un canal seguro.

Si la variable no está configurada o queda vacía tras un despliegue, la aplicación volverá automáticamente al token predeterminado `GEP_Group112`, mostrándolo como aviso en la pantalla de acceso.

### Revocación de tokens

1. Sigue los pasos anteriores hasta el paso 2.
2. Sustituye el valor de `VITE_AUTHORIZED_USERS` por una nueva lista de tokens o elimínalo por completo si quieres volver al valor predeterminado (`GEP_Group112`).
3. Guarda la variable y vuelve a desplegar la aplicación para invalidar accesos con los tokens anteriores. Los inicios de sesión activos dejarán de ser válidos la próxima vez que se recargue la aplicación o se pulse **Cerrar sesión**.
4. Si necesitas cerrar sesiones activas inmediatamente, solicita a la persona usuaria que pulse **Cerrar sesión** o elimina manualmente los datos de sesión desde las herramientas del navegador.

> **Nota:** Netlify oculta los valores tras guardarlos. Conserva los tokens actualizados en un gestor seguro.
