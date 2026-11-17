// ============================================================
//  db.js  →  conexión a MySQL y creación de las tablas
//
//  Qué hace al arrancar:
//   1) Se conecta a MySQL con los datos del archivo .env
//   2) Crea la base de datos y las tablas si no existen
//   3) La primera vez, carga el menú de ejemplo y las claves de demostración
// ============================================================

require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");
const crypto = require("crypto");

const BD = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "restaurante"
};

// El nombre de la base se escribe dentro de una consulta, así que solo permitimos letras, números y _
if (!/^\w+$/.test(BD.database)) {
  throw new Error("DB_NAME solo puede tener letras, números y guion bajo.");
}

// La carta real del restaurante (ver carta_real.js)
const PRODUCTOS_INICIALES = require("./carta_real");

// Claves de demostración (se guardan con hash, no en texto plano)
const CLAVES_INICIALES = { mesero: "1111", cocina: "2222", caja: "3333", administrador: "4444" };
const ROLES = Object.keys(CLAVES_INICIALES);

function hashClave(clave, sal) {
  return crypto.scryptSync(String(clave), sal, 32).toString("hex");
}

let pool = null;

// Las tablas. Los precios y nombres se COPIAN en pedido_items y venta_items:
// así una venta vieja no cambia si después se modifica el precio de un plato.
const TABLAS = [
  `CREATE TABLE IF NOT EXISTS config (
     id TINYINT PRIMARY KEY,
     nombre VARCHAR(40) NOT NULL,
     mesas INT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS usuarios (
     rol VARCHAR(20) PRIMARY KEY,
     sal VARCHAR(32) NOT NULL,
     hash VARCHAR(64) NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS productos (
     id INT AUTO_INCREMENT PRIMARY KEY,
     nombre VARCHAR(60) NOT NULL,
     precio INT NOT NULL,
     categoria VARCHAR(30) NOT NULL,
     emoji VARCHAR(16) NOT NULL DEFAULT '🍽️',
     imagen VARCHAR(120) NOT NULL DEFAULT '',
     descripcion VARCHAR(255) NOT NULL DEFAULT '',
     disponible TINYINT(1) NOT NULL DEFAULT 1
   )`,
  `CREATE TABLE IF NOT EXISTS mesas_abiertas (
     numero INT PRIMARY KEY,
     comensales INT NOT NULL,
     hora VARCHAR(20) NOT NULL,
     cuenta TINYINT(1) NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS pedidos (
     id INT AUTO_INCREMENT PRIMARY KEY,
     mesa INT NOT NULL,
     nota VARCHAR(100) NOT NULL DEFAULT '',
     estado VARCHAR(12) NOT NULL DEFAULT 'recibido',
     hora VARCHAR(20) NOT NULL,
     creado BIGINT NOT NULL,
     pagado TINYINT(1) NOT NULL DEFAULT 0,
     INDEX idx_pedidos_mesa (mesa, pagado)
   )`,
  `CREATE TABLE IF NOT EXISTS pedido_items (
     id INT AUTO_INCREMENT PRIMARY KEY,
     pedido_id INT NOT NULL,
     nombre VARCHAR(60) NOT NULL,
     precio INT NOT NULL,
     cantidad INT NOT NULL,
     FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
   )`,
  `CREATE TABLE IF NOT EXISTS turnos (
     id INT AUTO_INCREMENT PRIMARY KEY,
     abierto BIGINT NOT NULL,
     hora_apertura VARCHAR(20) NOT NULL,
     fecha VARCHAR(10) NOT NULL,
     inicial INT NOT NULL,
     cerrado TINYINT(1) NOT NULL DEFAULT 0,
     cierre BIGINT NULL,
     hora_cierre VARCHAR(20) NULL,
     contado INT NULL,
     diferencia INT NULL,
     resumen TEXT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS ventas (
     id INT AUTO_INCREMENT PRIMARY KEY,
     turno_id INT NOT NULL,
     mesa INT NOT NULL,
     comensales INT NOT NULL DEFAULT 0,
     subtotal INT NOT NULL,
     descuento INT NOT NULL DEFAULT 0,
     propina INT NOT NULL DEFAULT 0,
     total INT NOT NULL,
     metodo VARCHAR(20) NOT NULL,
     recibido INT NOT NULL,
     cambio INT NOT NULL DEFAULT 0,
     fecha VARCHAR(10) NOT NULL,
     hora VARCHAR(20) NOT NULL,
     INDEX idx_ventas_fecha (fecha),
     FOREIGN KEY (turno_id) REFERENCES turnos(id)
   )`,
  `CREATE TABLE IF NOT EXISTS venta_items (
     id INT AUTO_INCREMENT PRIMARY KEY,
     venta_id INT NOT NULL,
     nombre VARCHAR(60) NOT NULL,
     precio INT NOT NULL,
     cantidad INT NOT NULL,
     FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
   )`
];

async function insertarProductosIniciales(conexion) {
  for (const p of PRODUCTOS_INICIALES) {
    await conexion.query(
      "INSERT INTO productos (nombre, precio, categoria, emoji, imagen, descripcion) VALUES (?, ?, ?, ?, ?, ?)",
      [p.nombre, p.precio, p.categoria, p.emoji, p.imagen, p.descripcion]
    );
  }
}

async function iniciarBD() {
  // 1) Crear la base de datos si no existe
  let inicial;
  try {
    inicial = await mysql.createConnection({ host: BD.host, port: BD.port, user: BD.user, password: BD.password });
  } catch (error) {
    throw new Error(
      "No me pude conectar a MySQL en " + BD.host + ":" + BD.port + " con el usuario «" + BD.user + "» (" + error.code + ").\n" +
      "  → ¿Está encendido MySQL? (en XAMPP: botón Start en MySQL)\n" +
      "  → ¿Son correctos el usuario y la clave del archivo .env?"
    );
  }
  await inicial.query("CREATE DATABASE IF NOT EXISTS `" + BD.database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await inicial.end();

  // 2) Conexión que usará el servidor (un "pool" reparte varias conexiones)
  pool = mysql.createPool({
    host: BD.host, port: BD.port, user: BD.user, password: BD.password, database: BD.database,
    waitForConnections: true, connectionLimit: 10, charset: "utf8mb4"
  });

  // 3) Tablas
  for (const sql of TABLAS) {
    await pool.query(sql);
  }

  // 4) Datos de ejemplo, solo la primera vez
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM config");
  if (n === 0) {
    await pool.query("INSERT INTO config (id, nombre, mesas) VALUES (1, 'Frutos del Río', 10)");
    for (const rol of ROLES) {
      const sal = crypto.randomBytes(8).toString("hex");
      await pool.query("INSERT INTO usuarios (rol, sal, hash) VALUES (?, ?, ?)", [rol, sal, hashClave(CLAVES_INICIALES[rol], sal)]);
    }
    await insertarProductosIniciales(pool);
    console.log("  Base de datos nueva: se crearon las tablas, las claves de demostración y la carta del restaurante.");
  }
  return pool;
}

// Ejecuta varias consultas como UNA sola operación: o se guardan todas o no se guarda ninguna.
// (Por ejemplo, al cobrar: crear la venta + marcar pedidos pagados + liberar la mesa.)
async function transaccion(funcion) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await funcion(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  iniciarBD, transaccion, hashClave, insertarProductosIniciales, ROLES,
  consulta: function (sql, parametros) { return pool.query(sql, parametros); },
  obtenerPool: function () { return pool; },
  BD: BD
};
