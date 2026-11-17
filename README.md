# Frutos del Río · Sistema de restaurante
Node.js + Express + **MySQL**. Carta digital con QR para el celular, y módulos de mesero, cocina, caja y administrador con actualización en tiempo real.

**Lo que ve el cliente al escanear el QR** (`carta.html`) son las páginas originales de la carta del restaurante (PDF de enero 2026), tal cual, con opción de descargar el PDF. Además, `lista.html` muestra la lista con la disponibilidad del día (platos agotados).
**Lo que usa el personal** (mesero, caja, admin) es la misma carta cargada como 148 productos en 12 secciones; los platos con tamaños (Personal/Familiar, Mediano/Grande) son un producto por tamaño.

## 1. Requisitos
- **Node.js 18 o superior** → https://nodejs.org
- **MySQL** (cualquiera de las dos opciones):
  - **XAMPP** (lo más fácil en Windows): https://www.apachefriends.org → abre XAMPP Control Panel → pulsa **Start** en *MySQL*. Usuario `root`, sin clave.
  - **MySQL Server / MariaDB**: instálalo y anota la clave de `root`.

## 2. Ejecutar
```bash
npm install
npm start
```
- Si tu MySQL tiene clave (o no es XAMPP): copia `.env.example` como `.env` y escribe tu clave en `DB_PASSWORD=`.
- La base de datos `restaurante`, las tablas, la carta y las claves de demostración **se crean solas** la primera vez.
- Abre **http://localhost:3000**

### Opcional: importar la base de datos a mano
No es obligatorio (el sistema la crea sola), pero en `database/restaurante.sql` está el script completo (tablas + carta + claves de demostración). Para importarlo:
- **MySQL Workbench:** File → Open SQL Script → elige `restaurante.sql` → pulsa el rayo ⚡.
- **Terminal:** `mysql -u root -p < database/restaurante.sql`

## 3. HTTP (por defecto) y HTTPS opcional
El sistema funciona por **HTTP normal**: `http://localhost:3000`. Es lo más simple para una red WiFi local y no muestra advertencias en el celular.
- Para activar HTTPS con certificado propio (el navegador avisará "conexión no privada"), pon `HTTPS=on` en `.env`.
- Si lo publicas en internet, usa un hosting que ya da HTTPS.

## 4. QR para el celular
1. Computador y celular en el **mismo WiFi**.
2. Al iniciar, la terminal muestra la dirección, por ejemplo `http://192.168.1.35:3000/carta.html`. **Pruébala primero escribiéndola en el navegador del celular.** Si abre, el QR también.
3. Administrador → **QR para el celular**: elige la dirección del WiFi y el diseño (**Portada del restaurante con el QR** o tarjeta sencilla) → Imprimir.
- Si no abre: firewall de Windows (permite *Node.js* en redes privadas, o abre el puerto 3000), WiFi que aísla dispositivos (usa el hotspot del celular) o dirección equivocada (prueba otra de la lista).
- Para que funcione **desde cualquier lugar** (datos móviles): publica la carta (ver `carta-web`) o el sistema en internet y escribe esa dirección en el campo del QR (o `PUBLIC_URL` en `.env`).

## 5. Claves de demostración
| Rol | Clave |
|---|---|
| Mesero | 1111 |
| Cocina | 2222 |
| Caja | 3333 |
| Administrador | 4444 |

**Cámbialas** en Administrador → Ajustes antes de usarlo con clientes reales.

## 6. Cómo funciona un restaurante y cómo lo cubre el sistema
1. **Cliente** escanea el QR y ve la carta (solo mira).
2. **Mesero** abre la mesa, toma el pedido y lo envía a cocina.
3. **Cocina** lo ve al instante: recibido → preparando → listo.
4. **Mesero** entrega y, cuando el cliente la pide, pulsa *Pedir la cuenta*.
5. **Caja** abre turno (efectivo inicial), cobra (descuento, propina, método de pago, cambio) y entrega el recibo.
6. **Caja** cierra turno: cuenta el efectivo y el sistema dice si cuadra, sobra o falta.
7. **Administrador**: ventas, platos más vendidos, turnos, menú (precios, agotados, platos nuevos), QR, mesas y claves.

## 7. Base de datos (MySQL)
Tablas: `config`, `usuarios`, `productos`, `mesas_abiertas`, `pedidos`, `pedido_items`, `turnos`, `ventas`, `venta_items`.
- Nombres y precios se **copian** a `pedido_items` y `venta_items`: una venta antigua no cambia si luego cambias el precio de un plato.
- El cobro es una **transacción**: crear la venta, marcar pedidos pagados y liberar la mesa ocurre todo junto o no ocurre. Si dos cajeros cobran la misma mesa a la vez, solo uno lo logra.
- Todas las consultas usan parámetros (`?`), lo que evita inyección SQL.

## 8. Estructura
- `server.js` – API, reglas del negocio, roles y tiempo real (SSE)
- `db.js` – conexión a MySQL, tablas y datos iniciales
- `seguridad.js` – HTTPS opcional y certificado
- `carta_real.js` – la carta del restaurante (de aquí salen los 148 productos)
- `public/carta/` – las 4 páginas de la carta (imágenes) y el PDF original. **Para actualizar la carta del cliente**, reemplaza `pagina-1.jpg` … `pagina-4.jpg` y el PDF
- `public/` – páginas (`index`, `carta`, `mesero`, `cocina`, `caja`, `admin`), `js/`, `css/`, `img/`

## 9. Límites
- La carta que ve el cliente es una imagen: si cambias un precio en el módulo del administrador, **no se actualiza** en esas imágenes (sí en el sistema del personal y en `lista.html`). Hay que cambiar también las imágenes de `public/carta/`.
- La portada tiene poca resolución (229×422 px); para imprimirla nítida, cambia `public/img/portada.png` por la original en alta calidad (mismo diseño y posición del recuadro blanco del QR).
- Solo 3 platos tienen foto (las del PDF); el resto muestra un emoji. Para agregar fotos: ponlas en `public/img/` y escribe `img/nombre.jpg` en el plato (Administrador → Menú).
- Las sesiones están en memoria: si reinicias el servidor, el personal debe volver a entrar.
- El recibo es un documento interno, **no una factura electrónica**.
- Probado con MariaDB 10.11 (compatible con MySQL) en Linux; no probado en Windows/XAMPP.
