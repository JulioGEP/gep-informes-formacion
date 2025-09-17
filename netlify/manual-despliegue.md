# Manual de despliegue

## Configuración de autenticación por token

La aplicación se protege mediante un único token sensible a mayúsculas. Por defecto el valor incorporado en el código es `GEP_Group112`, aunque puede personalizarse definiendo la variable de entorno `VITE_ACCESS_TOKEN`.

### Cambiar el token en Netlify

1. Accede a Netlify y selecciona el sitio correspondiente.
2. Entra en **Site settings → Build & deploy → Environment → Environment variables**.
3. Crea o edita la variable `VITE_ACCESS_TOKEN` con el token que desees utilizar (por ejemplo, `GEP_Group112`).
4. Guarda los cambios y despliega nuevamente el sitio para que Vite recompile con los nuevos valores. Un _trigger_ manual de deploy desde **Deploys → Trigger deploy → Deploy site** es suficiente.
5. Comunica el token asignado al equipo autorizado por un canal seguro.

### Revocación del token

1. Sigue los pasos anteriores hasta el paso 2.
2. Sustituye el valor de `VITE_ACCESS_TOKEN` por un token nuevo o elimina la variable para volver al valor predeterminado (`GEP_Group112`).
3. Guarda la variable y vuelve a desplegar la aplicación para invalidar accesos con el token anterior. Los inicios de sesión activos dejarán de ser válidos la próxima vez que se recargue la aplicación o se pulse **Cerrar sesión**.
4. Si necesitas cerrar sesiones activas inmediatamente, solicita a la persona usuaria que pulse **Cerrar sesión** o elimina manualmente los datos de sesión desde las herramientas del navegador.

> **Nota:** Netlify oculta el valor de la variable tras guardarla. Conserva el token actualizado en un gestor seguro.
