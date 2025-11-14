<?php
$dsn = sprintf(
  'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
  envs('DB_HOST','mysql'),
  envs('DB_PORT','3306'),
  envs('DB_NAME','appdb')
);

$user = envs('DB_USER','appuser');
$pass = envs('DB_PASS','appsecret');

$options = [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$tries = 0;
while (true) {
  try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    break; // success
  } catch (PDOException $e) {
    $tries++;
    if ($tries >= 30) { // ~30 Sekunden
      http_response_code(500);
      exit('DB connection failed: ' . $e->getMessage());
    }
    sleep(1);
  }
}
