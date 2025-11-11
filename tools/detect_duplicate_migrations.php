<?php
// Simple script to detect duplicate migrations that create the same table name.
// Usage: php d:\Sites\rarebe\tools\detect_duplicate_migrations.php

$dir = __DIR__ . '/../backend/database/migrations';
if (!is_dir($dir)) {
    fwrite(STDERR, "Migrations dir not found: $dir\n");
    exit(2);
}

$files = scandir($dir);
$map = [];

foreach ($files as $f) {
    if (!preg_match('/\.php$/', $f)) continue;
    $path = $dir . '/' . $f;
    $src = file_get_contents($path);
    if ($src === false) continue;

    // match Schema::create('table_name' OR Schema::create("table_name"
    if (preg_match_all("/Schema::create\s*\(\s*['\"]([a-z0-9_]+)['\"]/i", $src, $m)) {
        foreach ($m[1] as $table) {
            $map[$table][] = $f;
        }
    }
}

// report duplicates
$duplicates = array_filter($map, fn($arr) => count($arr) > 1);
if (empty($duplicates)) {
    echo "No duplicate migration creating same table detected.\n";
    exit(0);
}

echo "Duplicate migrations detected for the same table(s):\n\n";
foreach ($duplicates as $table => $files) {
    echo "Table: {$table}\n";
    foreach ($files as $file) {
        echo "  - {$file}\n";
    }
    echo "\n";
}

echo "Next steps:\n";
echo " - Inspect the listed files and decide which one to keep (usually the one with the intended timestamp/class).\n";
echo " - Remove the other file(s) from {$dir} to avoid duplicate migrations.\n";
echo " - Run: php artisan migrate:status\n";
echo " - If needed, adjust filenames/timestamps to control migration order.\n";
