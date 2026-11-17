// ============================================================
//  carta_real.js  →  la carta de «Frutos del Río» (enero 2026), pasada del PDF del restaurante.
//  Los platos con tamaños (Personal/Familiar, Mediano/Grande) se separan en un producto por tamaño,
//  porque cada tamaño tiene su propio precio. Para cambiar un precio o agotar un plato,
//  usa el módulo del administrador (no hace falta editar este archivo).
// ============================================================

const PRODUCTOS = [];

// Un producto simple
function p(nombre, precio, categoria, emoji, descripcion, imagen) {
  PRODUCTOS.push({ nombre: nombre, precio: precio, categoria: categoria, emoji: emoji, imagen: imagen || "", descripcion: descripcion || "" });
}
// Un plato con varios tamaños: v("Cazuela", cat, emoji, desc, imagen, ["Mediano", 48000], ["Grande", 58000])
function v(nombre, categoria, emoji, descripcion, imagen, ...tamanos) {
  for (const t of tamanos) {
    p(nombre + " (" + t[0] + ")", t[1], categoria, emoji, descripcion, imagen);
  }
}

// ----- ENTRADAS -----
const E = "Entradas";
p("Papas bravas", 19800, E, "🍟", "Cascos de papa con una picosa y sabrosa salsa.");
p("Papas al ajillo", 30800, E, "🥔");
p("Crema de camarones", 29000, E, "🍲");
p("Anillos de calamar", 30000, E, "🦑");
v("Patacones al queso", E, "🍌", "", "", ["Personal", 24200], ["Familiar", 40000]);
v("Patacones frutos del mar", E, "🍤", "", "img/patacones-frutos-del-mar.jpg", ["Personal", 26400], ["Familiar", 43000]);
v("Patacones con hogao", E, "🍌", "", "", ["Personal", 14500], ["Familiar", 25000]);
v("Patacones al ajillo", E, "🍌", "", "", ["Personal", 23000], ["Familiar", 40000]);
p("Consomé de pescado (pequeño)", 21000, E, "🍵");
p("Salchipapas", 22000, E, "🌭");

// ----- PLATOS FUERTES -----
const F = "Platos fuertes";
v("Parrillada de mariscos", F, "🦐", "", "", ["Mediano", 75000], ["Grande", 129000]);
p("Consomé rodaja de bagre", 49000, F, "🍲", "Consomé exquisito de pescado de río y mar, con una generosa rodaja de dorado de 400 gramos, arroz y aguacate fresco.");
v("Cazuela de mariscos", F, "🦞", "Variedad de mariscos, camarones, calamares, almejas, pulpo, caracol y filetes de pescado con langostino, en una zarzuela con crema de leche.", "", ["Mediano", 48000], ["Grande", 58000]);
v("Cazuela clásica frutos del río", F, "🦞", "Cremosa cazuela de mariscos a base de crema bechamel, gratinada con queso parmesano.", "", ["Mediano", 48000], ["Grande", 58000]);
p("Cazuela de camarón", 58000, F, "🦐", "Camarones frescos en una cremosa zarzuela de fondo de pescado y crema de leche, decorada con un langostino de gran tamaño.");
v("Rollo de amarillo al queso", F, "🍽️", "Rollos de amarillo rellenos de jamón y queso, en base cremosa de zarzuela con camarones, champiñones y crema de leche, gratinados con queso parmesano.", "", ["Mediano", 44000], ["Grande", 64000]);
v("Amarillo a la Monseñor", F, "🍽️", "", "", ["Mediano", 44000], ["Grande", 64000]);
v("Salmón a la Monseñor", F, "🍣", "", "", ["Mediano", 48000], ["Grande", 66000]);
v("Paella de la casa", F, "🥘", "", "", ["Mediano", 54000], ["Grande", 94000]);
p("Arroz con camarones", 51000, F, "🍤");
v("Arroz canoero", F, "🍚", "Arroz de pescado al estilo llanero, bagre amarillo de río y camarones salteados, con trocitos de maduro.", "img/arroz-canoero.jpg", ["Mediano", 43500], ["Grande", 54500]);
p("Tripleta del Caribe", 65000, F, "🍽️", "Pollo en salsa de champiñones, filete de corvina en salsa de camarones, camarones en salsa de queso, aguacate y arroz.", "img/tripleta-del-caribe.jpg");
p("Picada de la casa", 85000, F, "🍽️", "Para compartir: camarones apanados, lomitos apanados con parmesano, huevos de codorniz, aros de cebolla, queso, papa francesa y platanitos.");
v("Canastilla de camarones", F, "🍤", "Camarones apanados en panko y parmesano, con papa francesa, salchichas y huevos de codorniz.", "", ["Personal", 47000], ["Familiar", 70000]);
p("Fiambre llanero (frito o sudado)", 69500, F, "🐟", "Postas de cachama fritas con salsa criolla, arroz de pescado, maduro, yuca frita y aguacate, dentro de hojas de bijao.");

// ----- FILETES Y PESCADOS -----
const P = "Filetes y pescados";
p("Filete de salmón a la plancha", 65000, P, "🐟");
p("Filete de salmón al ajillo", 72000, P, "🐟");
p("Filete de salmón en salsa de camarones", 72000, P, "🐟");
p("Filete de salmón en lluvia de mariscos", 75000, P, "🐟");
p("Filete de salmón a la Thermidor", 85000, P, "🐟");
p("Trucha a la plancha 400 gr", 39500, P, "🐟");
p("Trucha al ajillo 400 gr", 47000, P, "🐟");
p("Trucha en salsa de camarones 400 gr", 47000, P, "🐟");
p("Trucha en lluvia de mariscos 400 gr", 51000, P, "🐟");
p("Pargo rojo frito 700 gr", 82000, P, "🐠");
p("Pargo rojo frito a la criolla 700 gr", 86000, P, "🐠");
p("Pargo rojo frito en salsa de camarón 700 gr", 89000, P, "🐠");
p("Pargo rojo frito encocado 700 gr", 89000, P, "🐠", "Pescado de mar frito, bañado en cremosa salsa de hogao con cebolla puerro y crema de coco.");
p("Mojarra o cachama frita 700 gr", 42000, P, "🐟");
p("Mojarra o cachama frita al queso 700 gr", 52000, P, "🐟");
p("Mojarra o cachama encocada 700 gr", 49000, P, "🐟", "Pescado de río frito, bañado en cremosa salsa de hogao con cebolla puerro y crema de coco.");
p("Mojarra del río", 52000, P, "🐟", "Mojarra frita rellena con pimientos, cebollas y vegetales salteados en salsa agridulce.");
p("Mojarra o cachama en salsa de camarones 700 gr", 49000, P, "🐟");
p("Mojarra o cachama en lluvia de mariscos 700 gr", 52000, P, "🐟");
p("Mojarra o cachama a la criolla 700 gr", 46000, P, "🐟");
p("Viudo de capaz", 53000, P, "🐟");
p("Viudo de dorado", 53000, P, "🐟");
p("Rodaja de dorado a la plancha", 46000, P, "🐟");
p("Rodaja de dorado a la criolla", 50000, P, "🐟");
p("Rodaja de dorado en salsa de camarón", 54000, P, "🐟");
p("Rodaja de dorado al ajillo", 54000, P, "🐟");
p("Rodaja de dorado encocada", 54000, P, "🐟");
p("Rodaja de dorado en lluvia de mariscos", 57000, P, "🐟");
p("Churrasco de río (dorado)", 54000, P, "🐟");
p("Postas de cachama de río fritas 500 gr", 59000, P, "🐟");
p("Postas de cachama de río en salsa de camarón", 69000, P, "🐟");
p("Postas de cachama de río encocadas", 67000, P, "🐟");
p("Postas de cachama de río a la criolla", 63000, P, "🐟");

// ----- OTRAS ESPECIALIDADES -----
const O = "Otras especialidades";
p("Wok de vegetales y camarones", 55000, O, "🥘");
v("Churrasco", O, "🥩", "", "", ["Mediano 250 gr", 43000], ["Grande 500 gr", 75000]);
p("Pechuga de pollo a la plancha", 40000, O, "🍗");
p("Pechuga de pollo gratinada", 51000, O, "🍗");

// ----- MENÚ INFANTIL -----
const K = "Menú infantil";
p("Canastilla kids", 33000, K, "🍤", "Crujientes camarones apanados con papa francesa, salchichas, queso y huevos de codorniz.");
v("Tesoritos de pollo", K, "🍗", "Trocitos de pollo apanado o asado y papas a la francesa.", "", ["Sin crema de camarones", 26000], ["Con crema de camarones", 38000]);
v("Nuggets de pescado", K, "🐟", "Crujientes trocitos de filete de mojarra apanado con papas a la francesa.", "", ["Sin crema de camarones", 26000], ["Con crema de camarones", 38000]);

// ----- CEVICHERÍA -----
const C = "Cevichería";
p("Ceviche mixto fusión", 36000, C, "🍋", "Corvina, mixtura, pimentón, cebolla, cilantro, limón, maíz tostado y maíz tierno.");
p("Ceviche combinado", 32000, C, "🍋", "Camarones, con pulpo o calamar blanco.");
p("Ceviche hawaiano", 36000, C, "🍍", "Ceviche colombiano con piña, quesos y jamón.");
p("Ceviche peruano", 36000, C, "🍋", "Camarones y corvina.");
p("Superbomba", 34000, C, "🍋");
p("Ceviche de salmón y mango", 37500, C, "🥭");
v("Ceviche tradicional de camarones", C, "🍤", "", "", ["Mediano", 24000], ["Grande", 31000]);

// ----- POSTRES -----
const D = "Postres";
p("Mousse de fresa", 16000, D, "🍓");
p("Brownie con helado", 16000, D, "🍫");
p("Tiramisú", 16000, D, "🍰");

// ----- BEBIDAS -----
const B = "Bebidas";
p("Jugo natural en agua (mango, mora o maracuyá)", 9300, B, "🥭");
p("Jugo natural en leche (mango, mora o maracuyá)", 11500, B, "🥭");
p("Jarra personal de jugo en agua", 20000, B, "🧃");
p("Jarra familiar de jugo en agua", 31000, B, "🧃");
p("Soda 350 ml", 8000, B, "🥤");
p("Coca-Cola, Zero, Kola Román o Ginger", 8000, B, "🥤");
p("Cítrica", 11000, B, "🍋");
p("Soda italiana frutos rojos", 18000, B, "🍓");
p("Cerezada", 14000, B, "🍒");
p("Limonada de mango biche", 15000, B, "🍋");
p("Limonada de coco", 15000, B, "🥥");
p("Limonada de panela", 8500, B, "🍋");
p("Agua con o sin gas", 7500, B, "💧");

// ----- CERVEZAS -----
const Z = "Cervezas";
p("Stella", 15500, Z, "🍺");
p("Corona", 15500, Z, "🍺");
p("Club Colombia dorada", 10000, Z, "🍺");
p("Águila", 9500, Z, "🍺");
p("Águila Light", 9500, Z, "🍺");
p("Cola y Pola", 9500, Z, "🍺");

// ----- COCTELES -----
const T = "Cocteles";
p("Palomita linda", 35000, T, "🍹");
p("Mojito cubano", 34000, T, "🍹");
p("Mojito de mango", 35000, T, "🍹");
p("Piña colada", 37000, T, "🍹");
p("Orgasmo", 37000, T, "🍹");
p("Margarita Corona", 38800, T, "🍸");
p("Tequila atardecer", 34000, T, "🍹");
p("Tinto de verano", 24000, T, "🍷");

// ----- VINOS Y LICORES -----
const V = "Vinos y licores";
p("Espumoso JP Chenet, 2 copas (pícolo)", 45000, V, "🍾");
p("Espumoso JP Chenet Ice Rosado (botella)", 117000, V, "🍾");
p("Lambrusco espumoso Piccini (botella)", 95000, V, "🍾");
v("Santa Rita 120 Cabernet", V, "🍷", "", "", ["Botella", 124000], ["Media", 65000]);
v("Santa Rita 120 Sauvignon Blanc", V, "🍷", "", "", ["Botella", 124000], ["Media", 65000]);
p("Santa Rita Tres Medallas Merlot (botella)", 107000, V, "🍷");
p("Santa Rita Tres Medallas Sauvignon Blanc (botella)", 107000, V, "🍷");
v("Finca Las Moras Malbec", V, "🍷", "", "", ["Botella", 117000], ["Media", 65000]);
p("Finca Las Moras Bonarda (botella)", 117000, V, "🍷");
v("Finca Las Moras Chardonnay", V, "🍷", "", "", ["Botella", 117000], ["Media", 65000]);
p("Frontera Rosé (botella)", 112000, V, "🍷");
p("Copa de vino de temporada", 19000, V, "🍷");
v("Whisky Buchanan's 12 años", V, "🥃", "", "", ["Botella", 271000], ["Media", 189000]);

// ----- CAFÉS -----
const A = "Cafés";
p("Espresso", 4500, A, "☕");
p("Espresso doble", 6500, A, "☕");
p("Americano", 5000, A, "☕");
p("Tinto", 4500, A, "☕");
p("Latte", 8500, A, "☕");
p("Latte vainilla", 10000, A, "☕");
p("Capuccino", 9500, A, "☕");
p("Capuccino vainilla", 10000, A, "☕");
p("Adición de Baileys, amaretto o licor de café", 8500, A, "🥃");
p("Chocolate", 9500, A, "🍫");
p("Milo caliente", 8500, A, "🥛");

module.exports = PRODUCTOS;
