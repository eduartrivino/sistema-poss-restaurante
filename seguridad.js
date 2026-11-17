// ============================================================
//  seguridad.js  →  HTTPS (conexión cifrada)
//
//  HTTPS necesita un "certificado". Hay tres casos:
//   1) Tienes un certificado real (variables SSL_CERT y SSL_KEY) → se usa ese.
//   2) No tienes → creamos uno propio (autofirmado) en la carpeta certs/ la primera vez.
//      Cifra igual de bien, pero el navegador avisa «conexión no privada» porque ninguna
//      entidad lo conoce. Se acepta con «Avanzado → Continuar».
//   3) HTTPS=off → se usa HTTP normal (por ejemplo cuando el hosting ya pone el HTTPS).
// ============================================================

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const selfsigned = require("selfsigned");

const CARPETA = path.join(__dirname, "certs");

async function certificadoPropio(ips) {
  const archivoCert = path.join(CARPETA, "cert.pem");
  const archivoKey = path.join(CARPETA, "key.pem");
  const archivoIps = path.join(CARPETA, "ips.json");
  const direcciones = ["127.0.0.1"].concat(ips).sort();

  // Si ya existe y las direcciones de red no cambiaron, lo reutilizamos
  try {
    const guardadas = JSON.parse(fs.readFileSync(archivoIps, "utf8"));
    if (JSON.stringify(guardadas) === JSON.stringify(direcciones)) {
      return { cert: fs.readFileSync(archivoCert), key: fs.readFileSync(archivoKey) };
    }
  } catch (e) {
    // no existe todavía: lo creamos
  }

  // El certificado debe incluir las direcciones por las que se entrará (localhost y las IP del WiFi)
  const nombres = [{ type: 2, value: "localhost" }];
  for (const ip of direcciones) {
    nombres.push({ type: 7, ip: ip });
  }
  const pems = await selfsigned.generate([{ name: "commonName", value: "restaurante.local" }], {
    keySize: 2048,
    algorithm: "sha256",
    notAfterDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    extensions: [
      { name: "basicConstraints", cA: false },
      { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
      { name: "extKeyUsage", serverAuth: true },
      { name: "subjectAltName", altNames: nombres }
    ]
  });

  fs.mkdirSync(CARPETA, { recursive: true });
  fs.writeFileSync(archivoCert, pems.cert);
  fs.writeFileSync(archivoKey, pems.private, { mode: 0o600 });   // la llave privada solo la lee este usuario
  fs.writeFileSync(archivoIps, JSON.stringify(direcciones));
  return { cert: pems.cert, key: pems.private };
}

// Devuelve el servidor (HTTP o HTTPS) ya conectado a la aplicación Express
async function crearServidor(app, usaHttps, ips) {
  if (!usaHttps) {
    return http.createServer(app);
  }
  if (process.env.SSL_CERT && process.env.SSL_KEY) {
    return https.createServer({ cert: fs.readFileSync(process.env.SSL_CERT), key: fs.readFileSync(process.env.SSL_KEY) }, app);
  }
  return https.createServer(await certificadoPropio(ips), app);
}

module.exports = { crearServidor };
