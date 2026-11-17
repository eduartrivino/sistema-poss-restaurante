-- Base de datos «restaurante» (Frutos del Río). Importar en MySQL Workbench o con:  mysql -u root -p < restaurante.sql
-- Contiene las tablas, la carta (148 productos) y las claves de demostración (mesero 1111, cocina 2222, caja 3333, administrador 4444; guardadas con hash).
CREATE DATABASE IF NOT EXISTS restaurante CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurante;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `config` (
  `id` tinyint(4) NOT NULL,
  `nombre` varchar(40) NOT NULL,
  `mesas` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` VALUES
(1,'Frutos del Río',10);
/*!40000 ALTER TABLE `config` ENABLE KEYS */;
DROP TABLE IF EXISTS `mesas_abiertas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `mesas_abiertas` (
  `numero` int(11) NOT NULL,
  `comensales` int(11) NOT NULL,
  `hora` varchar(20) NOT NULL,
  `cuenta` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`numero`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `mesas_abiertas` DISABLE KEYS */;
/*!40000 ALTER TABLE `mesas_abiertas` ENABLE KEYS */;
DROP TABLE IF EXISTS `pedido_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedido_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedido_id` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `precio` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pedido_id` (`pedido_id`),
  CONSTRAINT `pedido_items_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `pedido_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `pedido_items` ENABLE KEYS */;
DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mesa` int(11) NOT NULL,
  `nota` varchar(100) NOT NULL DEFAULT '',
  `estado` varchar(12) NOT NULL DEFAULT 'recibido',
  `hora` varchar(20) NOT NULL,
  `creado` bigint(20) NOT NULL,
  `pagado` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_pedidos_mesa` (`mesa`,`pagado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `precio` int(11) NOT NULL,
  `categoria` varchar(30) NOT NULL,
  `emoji` varchar(16) NOT NULL DEFAULT '?️',
  `imagen` varchar(120) NOT NULL DEFAULT '',
  `descripcion` varchar(255) NOT NULL DEFAULT '',
  `disponible` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES
(1,'Papas bravas',19800,'Entradas','🍟','','Cascos de papa con una picosa y sabrosa salsa.',1),
(2,'Papas al ajillo',30800,'Entradas','🥔','','',1),
(3,'Crema de camarones',29000,'Entradas','🍲','','',1),
(4,'Anillos de calamar',30000,'Entradas','🦑','','',1),
(5,'Patacones al queso (Personal)',24200,'Entradas','🍌','','',1),
(6,'Patacones al queso (Familiar)',40000,'Entradas','🍌','','',1),
(7,'Patacones frutos del mar (Personal)',26400,'Entradas','🍤','img/patacones-frutos-del-mar.jpg','',1),
(8,'Patacones frutos del mar (Familiar)',43000,'Entradas','🍤','img/patacones-frutos-del-mar.jpg','',1),
(9,'Patacones con hogao (Personal)',14500,'Entradas','🍌','','',1),
(10,'Patacones con hogao (Familiar)',25000,'Entradas','🍌','','',1),
(11,'Patacones al ajillo (Personal)',23000,'Entradas','🍌','','',1),
(12,'Patacones al ajillo (Familiar)',40000,'Entradas','🍌','','',1),
(13,'Consomé de pescado (pequeño)',21000,'Entradas','🍵','','',1),
(14,'Salchipapas',22000,'Entradas','🌭','','',1),
(15,'Parrillada de mariscos (Mediano)',75000,'Platos fuertes','🦐','','',1),
(16,'Parrillada de mariscos (Grande)',129000,'Platos fuertes','🦐','','',1),
(17,'Consomé rodaja de bagre',49000,'Platos fuertes','🍲','','Consomé exquisito de pescado de río y mar, con una generosa rodaja de dorado de 400 gramos, arroz y aguacate fresco.',1),
(18,'Cazuela de mariscos (Mediano)',48000,'Platos fuertes','🦞','','Variedad de mariscos, camarones, calamares, almejas, pulpo, caracol y filetes de pescado con langostino, en una zarzuela con crema de leche.',1),
(19,'Cazuela de mariscos (Grande)',58000,'Platos fuertes','🦞','','Variedad de mariscos, camarones, calamares, almejas, pulpo, caracol y filetes de pescado con langostino, en una zarzuela con crema de leche.',1),
(20,'Cazuela clásica frutos del río (Mediano)',48000,'Platos fuertes','🦞','','Cremosa cazuela de mariscos a base de crema bechamel, gratinada con queso parmesano.',1),
(21,'Cazuela clásica frutos del río (Grande)',58000,'Platos fuertes','🦞','','Cremosa cazuela de mariscos a base de crema bechamel, gratinada con queso parmesano.',1),
(22,'Cazuela de camarón',58000,'Platos fuertes','🦐','','Camarones frescos en una cremosa zarzuela de fondo de pescado y crema de leche, decorada con un langostino de gran tamaño.',1),
(23,'Rollo de amarillo al queso (Mediano)',44000,'Platos fuertes','🍽️','','Rollos de amarillo rellenos de jamón y queso, en base cremosa de zarzuela con camarones, champiñones y crema de leche, gratinados con queso parmesano.',1),
(24,'Rollo de amarillo al queso (Grande)',64000,'Platos fuertes','🍽️','','Rollos de amarillo rellenos de jamón y queso, en base cremosa de zarzuela con camarones, champiñones y crema de leche, gratinados con queso parmesano.',1),
(25,'Amarillo a la Monseñor (Mediano)',44000,'Platos fuertes','🍽️','','',1),
(26,'Amarillo a la Monseñor (Grande)',64000,'Platos fuertes','🍽️','','',1),
(27,'Salmón a la Monseñor (Mediano)',48000,'Platos fuertes','🍣','','',1),
(28,'Salmón a la Monseñor (Grande)',66000,'Platos fuertes','🍣','','',1),
(29,'Paella de la casa (Mediano)',54000,'Platos fuertes','🥘','','',1),
(30,'Paella de la casa (Grande)',94000,'Platos fuertes','🥘','','',1),
(31,'Arroz con camarones',51000,'Platos fuertes','🍤','','',1),
(32,'Arroz canoero (Mediano)',43500,'Platos fuertes','🍚','img/arroz-canoero.jpg','Arroz de pescado al estilo llanero, bagre amarillo de río y camarones salteados, con trocitos de maduro.',1),
(33,'Arroz canoero (Grande)',54500,'Platos fuertes','🍚','img/arroz-canoero.jpg','Arroz de pescado al estilo llanero, bagre amarillo de río y camarones salteados, con trocitos de maduro.',1),
(34,'Tripleta del Caribe',65000,'Platos fuertes','🍽️','img/tripleta-del-caribe.jpg','Pollo en salsa de champiñones, filete de corvina en salsa de camarones, camarones en salsa de queso, aguacate y arroz.',1),
(35,'Picada de la casa',85000,'Platos fuertes','🍽️','','Para compartir: camarones apanados, lomitos apanados con parmesano, huevos de codorniz, aros de cebolla, queso, papa francesa y platanitos.',1),
(36,'Canastilla de camarones (Personal)',47000,'Platos fuertes','🍤','','Camarones apanados en panko y parmesano, con papa francesa, salchichas y huevos de codorniz.',1),
(37,'Canastilla de camarones (Familiar)',70000,'Platos fuertes','🍤','','Camarones apanados en panko y parmesano, con papa francesa, salchichas y huevos de codorniz.',1),
(38,'Fiambre llanero (frito o sudado)',69500,'Platos fuertes','🐟','','Postas de cachama fritas con salsa criolla, arroz de pescado, maduro, yuca frita y aguacate, dentro de hojas de bijao.',1),
(39,'Filete de salmón a la plancha',65000,'Filetes y pescados','🐟','','',1),
(40,'Filete de salmón al ajillo',72000,'Filetes y pescados','🐟','','',1),
(41,'Filete de salmón en salsa de camarones',72000,'Filetes y pescados','🐟','','',1),
(42,'Filete de salmón en lluvia de mariscos',75000,'Filetes y pescados','🐟','','',1),
(43,'Filete de salmón a la Thermidor',85000,'Filetes y pescados','🐟','','',1),
(44,'Trucha a la plancha 400 gr',39500,'Filetes y pescados','🐟','','',1),
(45,'Trucha al ajillo 400 gr',47000,'Filetes y pescados','🐟','','',1),
(46,'Trucha en salsa de camarones 400 gr',47000,'Filetes y pescados','🐟','','',1),
(47,'Trucha en lluvia de mariscos 400 gr',51000,'Filetes y pescados','🐟','','',1),
(48,'Pargo rojo frito 700 gr',82000,'Filetes y pescados','🐠','','',1),
(49,'Pargo rojo frito a la criolla 700 gr',86000,'Filetes y pescados','🐠','','',1),
(50,'Pargo rojo frito en salsa de camarón 700 gr',89000,'Filetes y pescados','🐠','','',1),
(51,'Pargo rojo frito encocado 700 gr',89000,'Filetes y pescados','🐠','','Pescado de mar frito, bañado en cremosa salsa de hogao con cebolla puerro y crema de coco.',1),
(52,'Mojarra o cachama frita 700 gr',42000,'Filetes y pescados','🐟','','',1),
(53,'Mojarra o cachama frita al queso 700 gr',52000,'Filetes y pescados','🐟','','',1),
(54,'Mojarra o cachama encocada 700 gr',49000,'Filetes y pescados','🐟','','Pescado de río frito, bañado en cremosa salsa de hogao con cebolla puerro y crema de coco.',1),
(55,'Mojarra del río',52000,'Filetes y pescados','🐟','','Mojarra frita rellena con pimientos, cebollas y vegetales salteados en salsa agridulce.',1),
(56,'Mojarra o cachama en salsa de camarones 700 gr',49000,'Filetes y pescados','🐟','','',1),
(57,'Mojarra o cachama en lluvia de mariscos 700 gr',52000,'Filetes y pescados','🐟','','',1),
(58,'Mojarra o cachama a la criolla 700 gr',46000,'Filetes y pescados','🐟','','',1),
(59,'Viudo de capaz',53000,'Filetes y pescados','🐟','','',1),
(60,'Viudo de dorado',53000,'Filetes y pescados','🐟','','',1),
(61,'Rodaja de dorado a la plancha',46000,'Filetes y pescados','🐟','','',1),
(62,'Rodaja de dorado a la criolla',50000,'Filetes y pescados','🐟','','',1),
(63,'Rodaja de dorado en salsa de camarón',54000,'Filetes y pescados','🐟','','',1),
(64,'Rodaja de dorado al ajillo',54000,'Filetes y pescados','🐟','','',1),
(65,'Rodaja de dorado encocada',54000,'Filetes y pescados','🐟','','',1),
(66,'Rodaja de dorado en lluvia de mariscos',57000,'Filetes y pescados','🐟','','',1),
(67,'Churrasco de río (dorado)',54000,'Filetes y pescados','🐟','','',1),
(68,'Postas de cachama de río fritas 500 gr',59000,'Filetes y pescados','🐟','','',1),
(69,'Postas de cachama de río en salsa de camarón',69000,'Filetes y pescados','🐟','','',1),
(70,'Postas de cachama de río encocadas',67000,'Filetes y pescados','🐟','','',1),
(71,'Postas de cachama de río a la criolla',63000,'Filetes y pescados','🐟','','',1),
(72,'Wok de vegetales y camarones',55000,'Otras especialidades','🥘','','',1),
(73,'Churrasco (Mediano 250 gr)',43000,'Otras especialidades','🥩','','',1),
(74,'Churrasco (Grande 500 gr)',75000,'Otras especialidades','🥩','','',1),
(75,'Pechuga de pollo a la plancha',40000,'Otras especialidades','🍗','','',1),
(76,'Pechuga de pollo gratinada',51000,'Otras especialidades','🍗','','',1),
(77,'Canastilla kids',33000,'Menú infantil','🍤','','Crujientes camarones apanados con papa francesa, salchichas, queso y huevos de codorniz.',1),
(78,'Tesoritos de pollo (Sin crema de camarones)',26000,'Menú infantil','🍗','','Trocitos de pollo apanado o asado y papas a la francesa.',1),
(79,'Tesoritos de pollo (Con crema de camarones)',38000,'Menú infantil','🍗','','Trocitos de pollo apanado o asado y papas a la francesa.',1),
(80,'Nuggets de pescado (Sin crema de camarones)',26000,'Menú infantil','🐟','','Crujientes trocitos de filete de mojarra apanado con papas a la francesa.',1),
(81,'Nuggets de pescado (Con crema de camarones)',38000,'Menú infantil','🐟','','Crujientes trocitos de filete de mojarra apanado con papas a la francesa.',1),
(82,'Ceviche mixto fusión',36000,'Cevichería','🍋','','Corvina, mixtura, pimentón, cebolla, cilantro, limón, maíz tostado y maíz tierno.',1),
(83,'Ceviche combinado',32000,'Cevichería','🍋','','Camarones, con pulpo o calamar blanco.',1),
(84,'Ceviche hawaiano',36000,'Cevichería','🍍','','Ceviche colombiano con piña, quesos y jamón.',1),
(85,'Ceviche peruano',36000,'Cevichería','🍋','','Camarones y corvina.',1),
(86,'Superbomba',34000,'Cevichería','🍋','','',1),
(87,'Ceviche de salmón y mango',37500,'Cevichería','🥭','','',1),
(88,'Ceviche tradicional de camarones (Mediano)',24000,'Cevichería','🍤','','',1),
(89,'Ceviche tradicional de camarones (Grande)',31000,'Cevichería','🍤','','',1),
(90,'Mousse de fresa',16000,'Postres','🍓','','',1),
(91,'Brownie con helado',16000,'Postres','🍫','','',1),
(92,'Tiramisú',16000,'Postres','🍰','','',1),
(93,'Jugo natural en agua (mango, mora o maracuyá)',9300,'Bebidas','🥭','','',1),
(94,'Jugo natural en leche (mango, mora o maracuyá)',11500,'Bebidas','🥭','','',1),
(95,'Jarra personal de jugo en agua',20000,'Bebidas','🧃','','',1),
(96,'Jarra familiar de jugo en agua',31000,'Bebidas','🧃','','',1),
(97,'Soda 350 ml',8000,'Bebidas','🥤','','',1),
(98,'Coca-Cola, Zero, Kola Román o Ginger',8000,'Bebidas','🥤','','',1),
(99,'Cítrica',11000,'Bebidas','🍋','','',1),
(100,'Soda italiana frutos rojos',18000,'Bebidas','🍓','','',1),
(101,'Cerezada',14000,'Bebidas','🍒','','',1),
(102,'Limonada de mango biche',15000,'Bebidas','🍋','','',1),
(103,'Limonada de coco',15000,'Bebidas','🥥','','',1),
(104,'Limonada de panela',8500,'Bebidas','🍋','','',1),
(105,'Agua con o sin gas',7500,'Bebidas','💧','','',1),
(106,'Stella',15500,'Cervezas','🍺','','',1),
(107,'Corona',15500,'Cervezas','🍺','','',1),
(108,'Club Colombia dorada',10000,'Cervezas','🍺','','',1),
(109,'Águila',9500,'Cervezas','🍺','','',1),
(110,'Águila Light',9500,'Cervezas','🍺','','',1),
(111,'Cola y Pola',9500,'Cervezas','🍺','','',1),
(112,'Palomita linda',35000,'Cocteles','🍹','','',1),
(113,'Mojito cubano',34000,'Cocteles','🍹','','',1),
(114,'Mojito de mango',35000,'Cocteles','🍹','','',1),
(115,'Piña colada',37000,'Cocteles','🍹','','',1),
(116,'Orgasmo',37000,'Cocteles','🍹','','',1),
(117,'Margarita Corona',38800,'Cocteles','🍸','','',1),
(118,'Tequila atardecer',34000,'Cocteles','🍹','','',1),
(119,'Tinto de verano',24000,'Cocteles','🍷','','',1),
(120,'Espumoso JP Chenet, 2 copas (pícolo)',45000,'Vinos y licores','🍾','','',1),
(121,'Espumoso JP Chenet Ice Rosado (botella)',117000,'Vinos y licores','🍾','','',1),
(122,'Lambrusco espumoso Piccini (botella)',95000,'Vinos y licores','🍾','','',1),
(123,'Santa Rita 120 Cabernet (Botella)',124000,'Vinos y licores','🍷','','',1),
(124,'Santa Rita 120 Cabernet (Media)',65000,'Vinos y licores','🍷','','',1),
(125,'Santa Rita 120 Sauvignon Blanc (Botella)',124000,'Vinos y licores','🍷','','',1),
(126,'Santa Rita 120 Sauvignon Blanc (Media)',65000,'Vinos y licores','🍷','','',1),
(127,'Santa Rita Tres Medallas Merlot (botella)',107000,'Vinos y licores','🍷','','',1),
(128,'Santa Rita Tres Medallas Sauvignon Blanc (botella)',107000,'Vinos y licores','🍷','','',1),
(129,'Finca Las Moras Malbec (Botella)',117000,'Vinos y licores','🍷','','',1),
(130,'Finca Las Moras Malbec (Media)',65000,'Vinos y licores','🍷','','',1),
(131,'Finca Las Moras Bonarda (botella)',117000,'Vinos y licores','🍷','','',1),
(132,'Finca Las Moras Chardonnay (Botella)',117000,'Vinos y licores','🍷','','',1),
(133,'Finca Las Moras Chardonnay (Media)',65000,'Vinos y licores','🍷','','',1),
(134,'Frontera Rosé (botella)',112000,'Vinos y licores','🍷','','',1),
(135,'Copa de vino de temporada',19000,'Vinos y licores','🍷','','',1),
(136,'Whisky Buchanan\'s 12 años (Botella)',271000,'Vinos y licores','🥃','','',1),
(137,'Whisky Buchanan\'s 12 años (Media)',189000,'Vinos y licores','🥃','','',1),
(138,'Espresso',4500,'Cafés','☕','','',1),
(139,'Espresso doble',6500,'Cafés','☕','','',1),
(140,'Americano',5000,'Cafés','☕','','',1),
(141,'Tinto',4500,'Cafés','☕','','',1),
(142,'Latte',8500,'Cafés','☕','','',1),
(143,'Latte vainilla',10000,'Cafés','☕','','',1),
(144,'Capuccino',9500,'Cafés','☕','','',1),
(145,'Capuccino vainilla',10000,'Cafés','☕','','',1),
(146,'Adición de Baileys, amaretto o licor de café',8500,'Cafés','🥃','','',1),
(147,'Chocolate',9500,'Cafés','🍫','','',1),
(148,'Milo caliente',8500,'Cafés','🥛','','',1);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
DROP TABLE IF EXISTS `turnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `abierto` bigint(20) NOT NULL,
  `hora_apertura` varchar(20) NOT NULL,
  `fecha` varchar(10) NOT NULL,
  `inicial` int(11) NOT NULL,
  `cerrado` tinyint(1) NOT NULL DEFAULT 0,
  `cierre` bigint(20) DEFAULT NULL,
  `hora_cierre` varchar(20) DEFAULT NULL,
  `contado` int(11) DEFAULT NULL,
  `diferencia` int(11) DEFAULT NULL,
  `resumen` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `turnos` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnos` ENABLE KEYS */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `rol` varchar(20) NOT NULL,
  `sal` varchar(32) NOT NULL,
  `hash` varchar(64) NOT NULL,
  PRIMARY KEY (`rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES
('administrador','977d254ed1c0827c','bcc44c98b441ae10a8dc0f5a720e62f5c98cd7142fd9201ff571162a004c85b4'),
('caja','15c793df7f9f0abd','ccfdeecf7735f73eca260023a76368fdac4a006bc8a370408eea48e45c8cbc1a'),
('cocina','24d44494975bbbf6','ca2f8dc71698cd64e4cb69631495157e78a0107a6e0023c9ad1641f257ade866'),
('mesero','8ad38c60f054620f','370a6283ae2fdf4e3be7ace45f9607d51a1be30c916a04d93ad8f6341395ad82');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
DROP TABLE IF EXISTS `venta_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `venta_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `venta_id` int(11) NOT NULL,
  `nombre` varchar(60) NOT NULL,
  `precio` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `venta_id` (`venta_id`),
  CONSTRAINT `venta_items_ibfk_1` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `venta_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `venta_items` ENABLE KEYS */;
DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `turno_id` int(11) NOT NULL,
  `mesa` int(11) NOT NULL,
  `comensales` int(11) NOT NULL DEFAULT 0,
  `subtotal` int(11) NOT NULL,
  `descuento` int(11) NOT NULL DEFAULT 0,
  `propina` int(11) NOT NULL DEFAULT 0,
  `total` int(11) NOT NULL,
  `metodo` varchar(20) NOT NULL,
  `recibido` int(11) NOT NULL,
  `cambio` int(11) NOT NULL DEFAULT 0,
  `fecha` varchar(10) NOT NULL,
  `hora` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ventas_fecha` (`fecha`),
  KEY `turno_id` (`turno_id`),
  CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

