# Manual de despliegue

## Configuración de autenticación por token

La aplicación utiliza un flujo de autenticación basado en tokens corporativos. Las credenciales válidas se definen mediante una variable de entorno que Netlify inyecta en el build (`VITE_AUTHORIZED_USERS`). Cada par `correo:token` habilita el acceso a una persona usuaria.

Además, las funciones serverless encargadas de consultar Pipedrive y generar informes (`/.netlify/functions/getDeal` y `/.netlify/functions/generateReport`) validan las peticiones mediante un **token compartido**. Para que el backend y el frontend permanezcan sincronizados hay que configurar dos variables con el mismo valor:

- `REPORTS_API_TOKEN`: se lee en el entorno del _runtime_ de Netlify y protege las funciones serverless.
- `VITE_REPORTS_API_TOKEN`: se inyecta en el bundle del frontend para que las peticiones incluyan la cabecera `Authorization`.

> ⚠️ **Importante:** ambos valores deben ser idénticos. Si se actualiza uno hay que actualizar el otro y volver a desplegar el sitio para que Vite reconstruya el frontend con el token nuevo.

### Alta o edición de usuarios autorizados

1. Accede a Netlify y selecciona el sitio correspondiente.
2. Entra en **Site settings → Build & deploy → Environment → Environment variables**.
3. Crea o edita la variable `VITE_AUTHORIZED_USERS` con el formato:

   ```text
   persona1@empresa.com:token-seguro-1,persona2@empresa.com:token-seguro-2
   ```

   - Se admiten comas, punto y coma o saltos de línea como separadores entre credenciales.
   - Los correos no distinguen mayúsculas/minúsculas, pero los tokens sí.
   - Si prefieres una única contraseña compartida, puedes definir solo el token (por ejemplo `token-unico`), asociarlo a `*` (`*:token-unico`) o incluso dejar en blanco la parte del correo (`:token-unico`). En todos los casos se aceptará para cualquier correo corporativo.
4. Guarda los cambios y despliega nuevamente el sitio para que Vite recompile con los nuevos valores. Un _trigger_ manual de deploy desde **Deploys → Trigger deploy → Deploy site** es suficiente.
   - Mientras migras la configuración, la aplicación seguirá aceptando la variable histórica `VITE_ACCESS_TOKEN`, pero se recomienda unificar todo en `VITE_AUTHORIZED_USERS`.
5. Comunica el token asignado a cada persona por un canal seguro.

### Token compartido para informes

1. Accede a **Site settings → Build & deploy → Environment → Environment variables**.
2. Crea o edita `REPORTS_API_TOKEN` con un valor aleatorio y seguro. Este token solo debe compartirse con quienes necesiten
   consumir las funciones de informes.
3. Crea o edita `VITE_REPORTS_API_TOKEN` reutilizando **exactamente** el mismo valor que en el paso anterior para que el
   frontend pueda firmar las peticiones.
4. Guarda los cambios y lanza un nuevo despliegue (por ejemplo desde **Deploys → Trigger deploy → Deploy site**) para que el
   bundle de Vite incluya el token actualizado.
5. Una vez completado el deploy, verifica que la función responde con éxito realizando una petición `POST` a
   `/.netlify/functions/getDeal` con un `dealId` válido y la cabecera `Authorization: Bearer <token>`. El endpoint debe
   devolver `200` y los datos del negocio consultado.

### Revocación de tokens

1. Sigue los pasos anteriores hasta el paso 2.
2. Elimina el par `correo:token` correspondiente o reemplaza el token por uno nuevo.
3. Guarda la variable y vuelve a desplegar la aplicación para invalidar sesiones futuras. El cierre de sesión es inmediato porque los tokens ya no coincidirán con el valor almacenado en Netlify.
4. Si necesitas cerrar sesiones activas, solicita a la persona usuaria que pulse **Cerrar sesión** o elimina manualmente los datos de sesión desde las herramientas del navegador.

> **Nota:** Netlify oculta el valor de la variable tras guardarla. Para rotar un token, vuelve a introducir toda la lista de credenciales y asegúrate de almacenarla en un gestor seguro.
