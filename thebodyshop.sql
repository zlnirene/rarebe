/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 80042 (8.0.42)
 Source Host           : localhost:3306
 Source Schema         : rarebeauty

 Target Server Type    : MySQL
 Target Server Version : 80042 (8.0.42)
 File Encoding         : 65001

 Date: 11/11/2025 13:32:46
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for addresses
-- ----------------------------
DROP TABLE IF EXISTS `addresses`;
CREATE TABLE `addresses`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `nama_tempat` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_telp` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kecamatan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kabupaten` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provinsi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `addresses_user_id_foreign`(`user_id` ASC) USING BTREE,
  CONSTRAINT `addresses_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of addresses
-- ----------------------------
INSERT INTO `addresses` VALUES (1, 1, 'tfytdyd', '628758764', 'jalan nomo rumah', 'kecamatan', 'kabupaten', 'desa 22', '2025-11-10 06:26:44', '2025-11-10 06:26:44');
INSERT INTO `addresses` VALUES (2, 2, 'rumah', '0812345678', 'jl jawa', 'jawa', 'jawa', 'jatim', '2025-11-10 07:01:41', '2025-11-10 07:01:41');
INSERT INTO `addresses` VALUES (3, 2, 'rumah', '0812345678', 'jl jawa', 'jawa', 'jawa', 'jatim', '2025-11-10 07:01:48', '2025-11-10 07:01:48');
INSERT INTO `addresses` VALUES (4, 7, 'rumah', '90990801212', 'jl.jawa', 'sedati', 'sidoarjo', 'jawa timur', '2025-11-11 05:08:57', '2025-11-11 05:08:57');

-- ----------------------------
-- Table structure for admin_roles
-- ----------------------------
DROP TABLE IF EXISTS `admin_roles`;
CREATE TABLE `admin_roles`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `admin_roles_user_id_foreign`(`user_id` ASC) USING BTREE,
  CONSTRAINT `admin_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of admin_roles
-- ----------------------------

-- ----------------------------
-- Table structure for cache
-- ----------------------------
DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache`  (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cache
-- ----------------------------

-- ----------------------------
-- Table structure for cache_locks
-- ----------------------------
DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks`  (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cache_locks
-- ----------------------------

-- ----------------------------
-- Table structure for cart_items
-- ----------------------------
DROP TABLE IF EXISTS `cart_items`;
CREATE TABLE `cart_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `price` decimal(12, 2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `cart_items_cart_id_foreign`(`cart_id` ASC) USING BTREE,
  INDEX `cart_items_product_id_foreign`(`product_id` ASC) USING BTREE,
  CONSTRAINT `cart_items_cart_id_foreign` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `cart_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cart_items
-- ----------------------------
INSERT INTO `cart_items` VALUES (6, 3, 5, 5, 170000.00, '2025-11-11 04:45:50', '2025-11-11 04:49:20');

-- ----------------------------
-- Table structure for carts
-- ----------------------------
DROP TABLE IF EXISTS `carts`;
CREATE TABLE `carts`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `total_price` decimal(12, 2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `carts_user_id_foreign`(`user_id` ASC) USING BTREE,
  CONSTRAINT `carts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of carts
-- ----------------------------
INSERT INTO `carts` VALUES (1, 2, 0.00, '2025-11-10 04:37:02', '2025-11-10 07:03:18');
INSERT INTO `carts` VALUES (2, 1, 0.00, '2025-11-10 06:24:02', '2025-11-11 05:49:15');
INSERT INTO `carts` VALUES (3, 7, 850000.00, '2025-11-11 04:45:50', '2025-11-11 04:49:20');

-- ----------------------------
-- Table structure for categories
-- ----------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `categories_slug_unique`(`slug` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of categories
-- ----------------------------
INSERT INTO `categories` VALUES (1, 'Body', 'body', 'Lotion, body butters', 'category/cat_6910ad8b5ae75.webp', 1, '2025-11-09 13:58:36', '2025-11-09 15:04:43');
INSERT INTO `categories` VALUES (2, 'Face', 'face', 'Facial cleanser, moisturizer, toner', 'category/cat_6910adc384a13.webp', 1, '2025-11-09 13:58:36', '2025-11-09 15:05:39');
INSERT INTO `categories` VALUES (3, 'Fragrance', 'fragrance', 'Eau de perfume, body mist', 'category/cat_6910ae589b96c.jpg', 1, '2025-11-09 13:58:36', '2025-11-09 15:08:08');
INSERT INTO `categories` VALUES (4, 'Hair', 'hair', 'shampoo, conditioner, hair mist', 'category/cat_6910afa26e419.jpg', 1, '2025-11-09 13:58:36', '2025-11-09 15:13:38');

-- ----------------------------
-- Table structure for couriers
-- ----------------------------
DROP TABLE IF EXISTS `couriers`;
CREATE TABLE `couriers`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12, 2) NOT NULL DEFAULT 0.00,
  `estimated_time` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of couriers
-- ----------------------------
INSERT INTO `couriers` VALUES (1, 'JNE', 15000.00, '2-4 Hari', 1, '2025-11-09 14:05:21', '2025-11-09 14:05:21');
INSERT INTO `couriers` VALUES (2, 'J&T Express', 14000.00, '2-3 Hari', 1, '2025-11-09 14:05:21', '2025-11-09 14:05:21');
INSERT INTO `couriers` VALUES (3, 'SiCepat Ekspres', 10000.00, '1-3 Hari', 1, '2025-11-09 14:05:21', '2025-11-09 14:05:21');
INSERT INTO `couriers` VALUES (4, 'POS Indonesia', 12000.00, '3-5 Hari', 1, '2025-11-09 14:05:21', '2025-11-09 14:05:21');
INSERT INTO `couriers` VALUES (5, 'TIKI', 14000.00, '2-4 Hari', 1, '2025-11-09 14:05:21', '2025-11-09 14:05:21');

-- ----------------------------
-- Table structure for failed_jobs
-- ----------------------------
DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `failed_jobs_uuid_unique`(`uuid` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of failed_jobs
-- ----------------------------

-- ----------------------------
-- Table structure for job_batches
-- ----------------------------
DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches`  (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `cancelled_at` int NULL DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of job_batches
-- ----------------------------

-- ----------------------------
-- Table structure for jobs
-- ----------------------------
DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED NULL DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `jobs_queue_index`(`queue` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of jobs
-- ----------------------------

-- ----------------------------
-- Table structure for migrations
-- ----------------------------
DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 66 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of migrations
-- ----------------------------
INSERT INTO `migrations` VALUES (48, '2025_11_09_000001_add_order_id_to_reviews_table', 1);
INSERT INTO `migrations` VALUES (49, '0001_01_01_000000_create_users_table', 2);
INSERT INTO `migrations` VALUES (50, '0001_01_01_000001_create_cache_table', 2);
INSERT INTO `migrations` VALUES (51, '0001_01_01_000002_create_jobs_table', 2);
INSERT INTO `migrations` VALUES (52, '2025_10_31_141311_create_personal_access_tokens_table', 2);
INSERT INTO `migrations` VALUES (53, '2025_10_31_153314_create_products_table', 2);
INSERT INTO `migrations` VALUES (54, '2025_10_31_153336_create_categories_table', 2);
INSERT INTO `migrations` VALUES (55, '2025_10_31_153425_create_product_images_table', 2);
INSERT INTO `migrations` VALUES (56, '2025_10_31_154022_create_admin_roles_table', 2);
INSERT INTO `migrations` VALUES (57, '2025_11_03_051111_create_addresses_table', 2);
INSERT INTO `migrations` VALUES (58, '2025_11_03_052416_create_product_variant_table', 2);
INSERT INTO `migrations` VALUES (59, '2025_11_03_074659_create_carts_table', 2);
INSERT INTO `migrations` VALUES (60, '2025_11_03_074711_create_couriers_table', 2);
INSERT INTO `migrations` VALUES (61, '2025_11_03_074712_create_cart_items_table', 2);
INSERT INTO `migrations` VALUES (62, '2025_11_03_074722_create_orders_table', 2);
INSERT INTO `migrations` VALUES (63, '2025_11_03_074733_create_order_items_table', 2);
INSERT INTO `migrations` VALUES (64, '2025_11_03_082308_add_flags_to_products_table', 2);
INSERT INTO `migrations` VALUES (65, '2025_11_08_000001_create_reviews_table', 2);

-- ----------------------------
-- Table structure for order_items
-- ----------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(12, 2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `order_items_order_id_foreign`(`order_id` ASC) USING BTREE,
  INDEX `order_items_product_id_foreign`(`product_id` ASC) USING BTREE,
  CONSTRAINT `order_items_order_id_foreign` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of order_items
-- ----------------------------
INSERT INTO `order_items` VALUES (1, 1, 8, 19, 420000.00, '2025-11-10 06:26:58', '2025-11-10 06:26:58');
INSERT INTO `order_items` VALUES (2, 1, 6, 1, 210000.00, '2025-11-10 06:26:58', '2025-11-10 06:26:58');
INSERT INTO `order_items` VALUES (3, 2, 8, 19, 420000.00, '2025-11-10 06:28:17', '2025-11-10 06:28:17');
INSERT INTO `order_items` VALUES (4, 2, 6, 1, 210000.00, '2025-11-10 06:28:17', '2025-11-10 06:28:17');
INSERT INTO `order_items` VALUES (5, 3, 8, 19, 420000.00, '2025-11-10 06:32:04', '2025-11-10 06:32:04');
INSERT INTO `order_items` VALUES (6, 3, 6, 1, 210000.00, '2025-11-10 06:32:04', '2025-11-10 06:32:04');
INSERT INTO `order_items` VALUES (7, 4, 7, 1, 160000.00, '2025-11-10 07:02:07', '2025-11-10 07:02:07');
INSERT INTO `order_items` VALUES (8, 4, 5, 1, 170000.00, '2025-11-10 07:02:07', '2025-11-10 07:02:07');
INSERT INTO `order_items` VALUES (9, 5, 7, 1, 160000.00, '2025-11-10 07:02:50', '2025-11-10 07:02:50');
INSERT INTO `order_items` VALUES (10, 5, 5, 1, 170000.00, '2025-11-10 07:02:50', '2025-11-10 07:02:50');
INSERT INTO `order_items` VALUES (11, 6, 5, 5, 170000.00, '2025-11-11 05:47:56', '2025-11-11 05:47:56');
INSERT INTO `order_items` VALUES (12, 7, 5, 5, 170000.00, '2025-11-11 05:48:48', '2025-11-11 05:48:48');

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `address_id` bigint UNSIGNED NOT NULL,
  `courier_id` bigint UNSIGNED NOT NULL,
  `order_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_price` decimal(12, 2) NOT NULL,
  `status` enum('pending','paid','shipped','to receive','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `is_complete` tinyint(1) NOT NULL DEFAULT 0,
  `cancel` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `orders_order_code_unique`(`order_code` ASC) USING BTREE,
  INDEX `orders_user_id_foreign`(`user_id` ASC) USING BTREE,
  INDEX `orders_address_id_foreign`(`address_id` ASC) USING BTREE,
  INDEX `orders_courier_id_foreign`(`courier_id` ASC) USING BTREE,
  CONSTRAINT `orders_address_id_foreign` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `orders_courier_id_foreign` FOREIGN KEY (`courier_id`) REFERENCES `couriers` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `orders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of orders
-- ----------------------------
INSERT INTO `orders` VALUES (1, 1, 1, 1, 'RB20251110RQRNAR', 8205000.00, 'pending', 0, NULL, '2025-11-10 06:26:58', '2025-11-10 06:26:58');
INSERT INTO `orders` VALUES (2, 1, 1, 1, 'RB20251110GJKPEQ', 8205000.00, 'pending', 0, NULL, '2025-11-10 06:28:17', '2025-11-10 06:28:17');
INSERT INTO `orders` VALUES (3, 1, 1, 1, 'RB20251110EGRDVS', 8205000.00, 'completed', 1, NULL, '2025-11-10 06:32:04', '2025-11-10 06:35:44');
INSERT INTO `orders` VALUES (4, 2, 3, 1, 'RB20251110TRTY2V', 345000.00, 'pending', 0, NULL, '2025-11-10 07:02:07', '2025-11-10 07:02:07');
INSERT INTO `orders` VALUES (5, 2, 3, 1, 'RB20251110XNYYQR', 345000.00, 'completed', 1, NULL, '2025-11-10 07:02:50', '2025-11-10 07:04:47');
INSERT INTO `orders` VALUES (6, 1, 1, 1, 'RB20251111RH8XVS', 865000.00, 'pending', 0, NULL, '2025-11-11 05:47:56', '2025-11-11 05:47:56');
INSERT INTO `orders` VALUES (7, 1, 1, 1, 'RB20251111BX52HM', 865000.00, 'completed', 1, NULL, '2025-11-11 05:48:48', '2025-11-11 05:51:05');

-- ----------------------------
-- Table structure for password_reset_tokens
-- ----------------------------
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens`  (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of password_reset_tokens
-- ----------------------------

-- ----------------------------
-- Table structure for personal_access_tokens
-- ----------------------------
DROP TABLE IF EXISTS `personal_access_tokens`;
CREATE TABLE `personal_access_tokens`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint UNSIGNED NOT NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `personal_access_tokens_token_unique`(`token` ASC) USING BTREE,
  INDEX `personal_access_tokens_tokenable_type_tokenable_id_index`(`tokenable_type` ASC, `tokenable_id` ASC) USING BTREE,
  INDEX `personal_access_tokens_expires_at_index`(`expires_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of personal_access_tokens
-- ----------------------------
INSERT INTO `personal_access_tokens` VALUES (10, 'App\\Models\\User', 6, 'customer-auth', '08dcc75b75ef1925a177aa587f1e320d5d27a06c389c7bd96f9d1cf1e091eff3', '[\"*\"]', '2025-11-11 03:19:30', NULL, '2025-11-11 03:18:24', '2025-11-11 03:19:30');
INSERT INTO `personal_access_tokens` VALUES (12, 'App\\Models\\User', 7, 'customer-auth', '2113225006e0591398b14ea800febabf10c49bf8355a4fd83714dae800d230e7', '[\"*\"]', '2025-11-11 05:37:39', NULL, '2025-11-11 04:27:50', '2025-11-11 05:37:39');
INSERT INTO `personal_access_tokens` VALUES (13, 'App\\Models\\User', 2, 'superadmin-auth', '6987c2d3844427b82afb6f2c26c2e24dbfdd97449bcfe9c5146ec78c898c20c6', '[\"*\"]', '2025-11-11 05:50:05', NULL, '2025-11-11 04:30:40', '2025-11-11 05:50:05');
INSERT INTO `personal_access_tokens` VALUES (15, 'App\\Models\\User', 1, 'customer-auth', '1e180ba2fcd9a57b6bdabb136b63b2a3df6607dc9828a424ed90716062bde9e5', '[\"*\"]', '2025-11-11 05:54:29', NULL, '2025-11-11 05:45:12', '2025-11-11 05:54:29');

-- ----------------------------
-- Table structure for product_images
-- ----------------------------
DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `image_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `product_images_product_id_foreign`(`product_id` ASC) USING BTREE,
  CONSTRAINT `product_images_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_images
-- ----------------------------
INSERT INTO `product_images` VALUES (1, 1, 'products/pimg_69115b1c98ae9.jpg', 0, 0, '2025-11-10 03:25:16', '2025-11-10 03:31:58');
INSERT INTO `product_images` VALUES (2, 1, 'products/pimg_69115b810e93a.webp', 0, 0, '2025-11-10 03:26:57', '2025-11-10 03:31:58');
INSERT INTO `product_images` VALUES (3, 1, 'products/pimg_69115b9b11191.webp', 1, 0, '2025-11-10 03:27:23', '2025-11-10 03:31:58');
INSERT INTO `product_images` VALUES (4, 3, 'products/pimg_69116200bed4f.webp', 0, 0, '2025-11-10 03:54:40', '2025-11-10 04:02:50');
INSERT INTO `product_images` VALUES (6, 3, 'products/pimg_691163ea11432.jpg', 1, 0, '2025-11-10 04:02:50', '2025-11-10 04:02:50');
INSERT INTO `product_images` VALUES (7, 4, 'products/pimg_691164c81f8b4.webp', 0, 0, '2025-11-10 04:06:32', '2025-11-10 04:07:27');
INSERT INTO `product_images` VALUES (8, 4, 'products/pimg_691164e1b9b11.webp', 1, 0, '2025-11-10 04:06:57', '2025-11-10 04:07:27');
INSERT INTO `product_images` VALUES (9, 5, 'products/pimg_691165d67b82a.webp', 1, 0, '2025-11-10 04:11:02', '2025-11-10 04:19:48');
INSERT INTO `product_images` VALUES (10, 5, 'products/pimg_6911664a50fad.webp', 0, 0, '2025-11-10 04:12:58', '2025-11-10 04:19:48');
INSERT INTO `product_images` VALUES (11, 6, 'products/pimg_69117167d1837.jpg', 1, 0, '2025-11-10 05:00:23', '2025-11-10 05:00:23');
INSERT INTO `product_images` VALUES (12, 6, 'products/pimg_691171898f2bf.jpg', 0, 0, '2025-11-10 05:00:57', '2025-11-10 05:00:57');
INSERT INTO `product_images` VALUES (13, 6, 'products/pimg_691171da877b8.webp', 0, 0, '2025-11-10 05:02:18', '2025-11-10 05:02:18');
INSERT INTO `product_images` VALUES (14, 9, 'products/pimg_691177e0e37f3.webp', 1, 0, '2025-11-10 05:28:00', '2025-11-10 05:28:00');
INSERT INTO `product_images` VALUES (15, 9, 'products/pimg_691178609b077.jpg', 0, 0, '2025-11-10 05:30:08', '2025-11-10 05:30:08');
INSERT INTO `product_images` VALUES (18, 13, 'products/pimg_691179f558ede.webp', 1, 0, '2025-11-10 05:36:53', '2025-11-10 05:36:53');
INSERT INTO `product_images` VALUES (19, 13, 'products/pimg_69117a22eedc3.jpg', 0, 0, '2025-11-10 05:37:38', '2025-11-10 05:37:38');
INSERT INTO `product_images` VALUES (20, 14, 'products/pimg_69117a535f176.jpg', 1, 0, '2025-11-10 05:38:27', '2025-11-10 05:38:27');
INSERT INTO `product_images` VALUES (21, 16, 'products/pimg_69117aa62ad1d.webp', 0, 0, '2025-11-10 05:39:50', '2025-11-10 05:46:19');
INSERT INTO `product_images` VALUES (22, 14, 'products/pimg_69117abc824e1.jpg', 0, 0, '2025-11-10 05:40:12', '2025-11-10 05:40:12');
INSERT INTO `product_images` VALUES (23, 12, 'products/pimg_69117bbb3b479.jpg', 0, 0, '2025-11-10 05:44:27', '2025-11-10 05:44:27');
INSERT INTO `product_images` VALUES (24, 16, 'products/pimg_69117c2b7557f.webp', 1, 0, '2025-11-10 05:46:19', '2025-11-10 05:46:19');
INSERT INTO `product_images` VALUES (25, 15, 'products/pimg_69117c96f100c.webp', 1, 0, '2025-11-10 05:48:06', '2025-11-10 05:49:15');
INSERT INTO `product_images` VALUES (26, 11, 'products/pimg_69117cb06497d.jpg', 1, 0, '2025-11-10 05:48:32', '2025-11-10 05:48:32');
INSERT INTO `product_images` VALUES (27, 15, 'products/pimg_69117cc8042dd.webp', 0, 0, '2025-11-10 05:48:56', '2025-11-10 05:49:15');

-- ----------------------------
-- Table structure for product_variant
-- ----------------------------
DROP TABLE IF EXISTS `product_variant`;
CREATE TABLE `product_variant`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `variant_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `stock` int NOT NULL DEFAULT 0,
  `variant_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `product_variant_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `product_variant_sku_unique`(`sku` ASC) USING BTREE,
  INDEX `product_variant_product_id_foreign`(`product_id` ASC) USING BTREE,
  CONSTRAINT `product_variant_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of product_variant
-- ----------------------------

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `modal_price` decimal(12, 2) NOT NULL,
  `price` decimal(12, 2) NOT NULL,
  `is_new` tinyint(1) NOT NULL DEFAULT 0,
  `is_best_seller` tinyint(1) NOT NULL DEFAULT 0,
  `stock` int NOT NULL DEFAULT 0,
  `sku` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `bpom_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `long_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `tips` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `main_image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `products_slug_unique`(`slug` ASC) USING BTREE,
  UNIQUE INDEX `products_sku_unique`(`sku` ASC) USING BTREE,
  INDEX `products_category_id_index`(`category_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO `products` VALUES (1, 1, 'Shea Body Butter', 'shea-body-butter', 'Rich body butter that deeply moisturizes and softens very dry skin.', 200000.00, 270000.00, 0, 1, 100, 'B-3WQ2V1YO', NULL, 'Rich body butter that deeply moisturizes and softens very dry skin.', NULL, 'products/prod_6910acf1831b6.webp', 1, '2025-11-09 14:04:33', '2025-11-11 05:32:15');
INSERT INTO `products` VALUES (2, 1, 'Moringa Body Lotion', 'moringa-body-lotion', 'Lightweight lotion that hydrates skin and leaves a refreshing floral scent of moringa.', 130000.00, 180000.00, 0, 0, 120, 'B-TDSZ7FL5', NULL, 'Lightweight lotion that hydrates skin and leaves a refreshing floral scent of moringa.', NULL, 'products/prod_6910ad1b46f8d.webp', 1, '2025-11-09 14:04:33', '2025-11-09 15:02:51');
INSERT INTO `products` VALUES (3, 1, 'British Rose Shower Gel', 'british-rose-shower-gel', 'Refreshing shower gel infused with real rose essence.', 110000.00, 150000.00, 0, 0, 140, 'B-E6PKQEIW', NULL, 'It’s a special gel-type body cleanser enhanced with the exquisite scent of roses, delivering an extraordinary feeling of freshness.\r\n\r\nFormulated with organic aloe vera from Mexico and responsibly sourced rose extract through the Community Fair Trade program, this product provides a captivating moisturizing sensation.\r\n\r\nDuring use, it gently cleanses the skin without stripping away its natural moisture.', NULL, 'products/prod_69116400c0834.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 04:03:12');
INSERT INTO `products` VALUES (4, 1, 'Almond Milk Body Yogurt', 'almond-milk-body-yogurt', 'Fast-absorbing gel-cream that provides 48-hour moisture.', 170000.00, 230000.00, 1, 0, 110, 'B-IAR4URRL', NULL, 'Fast-absorbing gel-cream that provides 48-hour moisture.', NULL, 'products/prod_6911655563822.webp', 1, '2025-11-09 14:04:33', '2025-11-10 04:08:53');
INSERT INTO `products` VALUES (5, 2, 'Tea Tree Facial Wash', 'tea-tree-facial-wash', 'Purifying cleanser that removes impurities and helps reduce blemishes.', 120000.00, 170000.00, 0, 1, 0, 'F-DAF1CJFH', NULL, 'Purifying cleanser that removes impurities and helps reduce blemishes.', NULL, 'products/prod_6911665724fd8.webp', 1, '2025-11-09 14:04:33', '2025-11-11 05:49:15');
INSERT INTO `products` VALUES (6, 2, 'Vitamin E Moisture Gel Cream', 'vitamin-e-moisture-cream', 'Hydrating face cream enriched with vitamin E for soft, smooth skin.', 150000.00, 210000.00, 1, 0, 99, 'F-VOWHSFSM', NULL, 'Hydrating face cream enriched with vitamin E for soft, smooth skin.', NULL, 'products/prod_691171fd0bcdd.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 06:32:37');
INSERT INTO `products` VALUES (7, 2, 'Aloe Calming Toner', 'aloe-calming-toner', 'Gentle alcohol-free toner that soothes and refreshes sensitive skin.', 120000.00, 160000.00, 0, 0, 79, 'F-3TW39WDA', NULL, 'Gentle alcohol-free toner that soothes and refreshes sensitive skin.', NULL, 'products/prod_6911771922965.webp', 1, '2025-11-09 14:04:33', '2025-11-10 07:03:18');
INSERT INTO `products` VALUES (8, 2, 'Drops of Youth Concentrate', 'drops-of-youth-concentrate', 'Light serum that helps skin look smoother and fresher.', 310000.00, 420000.00, 0, 1, 51, 'F-EZJE6NL1', NULL, 'Light serum that helps skin look smoother and fresher.', NULL, 'products/prod_69117b254312a.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 06:32:37');
INSERT INTO `products` VALUES (9, 3, 'White Musk Eau de Toilette', 'white-musk-eau-de-toilette', 'Iconic floral musk fragrance that is soft, sensual, and cruelty-free.', 280000.00, 390000.00, 0, 0, 60, 'FR-0YCVYDTA', NULL, 'Iconic floral musk fragrance that is soft, sensual, and cruelty-free.', NULL, 'products/prod_6911787c52a4b.webp', 1, '2025-11-09 14:04:33', '2025-11-10 05:30:36');
INSERT INTO `products` VALUES (10, 3, 'Black Musk Body Mist', 'black-musk-body-mist', 'Sweet, sensual body mist with notes of musk, vanilla, and black sugar.', 170000.00, 230000.00, 0, 0, 100, 'FR-EMMHOQFN', NULL, 'Sweet, sensual body mist with notes of musk, vanilla, and black sugar.', NULL, 'products/prod_69117b974b0a9.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 05:43:51');
INSERT INTO `products` VALUES (11, 3, 'Japanese Cherry Blossom Eau de Toilette', 'japanese-cherry-blossom-eau-de-toilette', 'Delicate floral scent inspired by blooming cherry blossoms.', 260000.00, 370000.00, 0, 0, 80, 'FR-GKI9OSEZ', NULL, 'Delicate floral scent inspired by blooming cherry blossoms.', NULL, 'products/prod_69117cceccae3.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 05:49:02');
INSERT INTO `products` VALUES (12, 3, 'Pink Grapefruit Body Mist', 'pink-grapefruit-body-mist', 'Fruity mist for a refreshing and energizing scent all day.', 140000.00, 190000.00, 1, 0, 120, 'FR-THDXOFV8', NULL, 'Fruity mist for a refreshing and energizing scent all day.', NULL, 'products/prod_69117bf3d6e65.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 05:45:23');
INSERT INTO `products` VALUES (13, 4, 'Ginger Anti-Dandruff Shampoo', 'ginger-anti-dandruff-shampoo', 'Refreshing shampoo that helps reduce flakes and soothes scalp.', 160000.00, 220000.00, 0, 0, 90, 'H-K0YTDHHU', NULL, 'Refreshing shampoo that helps reduce flakes and soothes scalp.', NULL, 'products/prod_69117a5a0a93b.webp', 1, '2025-11-09 14:04:33', '2025-11-10 05:38:34');
INSERT INTO `products` VALUES (14, 4, 'Banana Truly Nourishing Conditioner', 'banana-truly-nourishing-conditioner', 'Creamy conditioner enriched with banana puree for silky hair.', 150000.00, 210000.00, 0, 0, 100, 'H-DTWN46CD', NULL, 'Creamy conditioner enriched with banana puree for silky hair.', NULL, 'products/prod_69117ae2112a6.jpg', 1, '2025-11-09 14:04:33', '2025-11-10 05:40:50');
INSERT INTO `products` VALUES (15, 4, 'Tea Tree Purifying & Balancing Hair Mask', 'tea-tree-purifying-balancing-hair-mask', 'Purifies scalp and refreshes hair without weighing it down.', 240000.00, 310000.00, 0, 0, 60, 'H-AYYDWVSN', NULL, 'Purifies scalp and refreshes hair without weighing it down.', NULL, NULL, 1, '2025-11-09 14:04:33', '2025-11-09 14:04:33');
INSERT INTO `products` VALUES (16, 4, 'Moringa Shine & Protection Hair Mist', 'moringa-shine-protection-hair-mist', 'Lightweight mist that adds shine and protects hair from pollution.', 200000.00, 270000.00, 1, 0, 80, 'H-VXCC6ZWA', NULL, 'Lightweight mist that adds shine and protects hair from pollution.', NULL, 'products/prod_69117ac804e3e.webp', 1, '2025-11-09 14:04:33', '2025-11-10 05:47:26');

-- ----------------------------
-- Table structure for reviews
-- ----------------------------
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `order_item_id` bigint UNSIGNED NOT NULL,
  `rating` tinyint NOT NULL COMMENT '1-5',
  `review` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `reviews_product_id_user_id_unique`(`product_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `reviews_user_id_foreign`(`user_id` ASC) USING BTREE,
  INDEX `reviews_order_item_id_foreign`(`order_item_id` ASC) USING BTREE,
  CONSTRAINT `reviews_order_item_id_foreign` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `reviews_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of reviews
-- ----------------------------
INSERT INTO `reviews` VALUES (1, 8, 1, 5, 5, 'jelllllllllll4ek', '2025-11-10 06:39:30', '2025-11-10 06:39:30');
INSERT INTO `reviews` VALUES (2, 7, 2, 9, 3, 'terlambat', '2025-11-10 07:11:19', '2025-11-10 07:22:05');

-- ----------------------------
-- Table structure for sessions
-- ----------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions`  (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sessions_user_id_index`(`user_id` ASC) USING BTREE,
  INDEX `sessions_last_activity_index`(`last_activity` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of sessions
-- ----------------------------

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `otp_code` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `otp_expires_at` timestamp NULL DEFAULT NULL,
  `api_token` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `role` enum('superadmin','admin','customer') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_email_unique`(`email` ASC) USING BTREE,
  UNIQUE INDEX `users_api_token_unique`(`api_token` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'Zelina Chrisani', 'zelinachrisani29@gmail.com', '2025-11-09 13:58:26', '$2y$12$BG0MnyykN393t8XXXl/Kte0we2qNtDn.YJnLZoiLxpOvYwSTMTgGG', 1, NULL, NULL, NULL, 'customer', '0MVTX0nvKp', '2025-11-09 13:58:26', '2025-11-11 05:45:12');
INSERT INTO `users` VALUES (2, 'ren', 'zelinairene899@gmail.com', '2025-11-09 13:58:26', '$2y$12$LVEuxrZw1DtXFBG4wlyvQerUbEcg17zMuqfg/bAMOHzIWmP6Ua42u', 1, NULL, NULL, NULL, 'superadmin', 'lnLme4l8Ml', '2025-11-09 13:58:26', '2025-11-11 04:30:40');
INSERT INTO `users` VALUES (3, 'Noah James', 'customer2@example.com', '2025-11-09 13:58:27', '$2y$12$W3UF/WeyeqGwhbUlN8arH.eqcP5WR.kOLyyuz3ZzeZpf6xJyaFzJq', 1, NULL, NULL, NULL, 'customer', '8lcX49E4MK', '2025-11-09 13:58:27', '2025-11-09 13:58:27');
INSERT INTO `users` VALUES (4, 'Mia Harper', 'customer3@example.com', '2025-11-09 13:58:27', '$2y$12$Lm2FVVXD7cWfDnow830NneF7dLpgUNuu1BPGhk34fPj7HwOUBYmUy', 1, NULL, NULL, NULL, 'customer', 'sjeVlQZsmq', '2025-11-09 13:58:27', '2025-11-09 13:58:27');
INSERT INTO `users` VALUES (7, 'Maura', 'azzaharamaura@gmail.com', '2025-11-11 04:27:50', '$2y$12$5ANbP6ObmkSe4iJYli6USOxYIz/gk.enrpVw66h1YgDBClcjO/hrm', 1, NULL, NULL, NULL, 'customer', NULL, '2025-11-11 04:27:33', '2025-11-11 05:37:26');
INSERT INTO `users` VALUES (12, 'darma', 'darm1748a@gmail.com', NULL, '$2y$12$RfszHyrXh6bD2rS9I6fq8eXrVXcKfjbJZmfzdM/H89mbXazrsP3Gy', 1, NULL, NULL, NULL, 'admin', NULL, '2025-11-11 05:06:26', '2025-11-11 05:06:26');

SET FOREIGN_KEY_CHECKS = 1;
