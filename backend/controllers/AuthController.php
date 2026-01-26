<?php

class AuthController
{
  public function __construct(private PDO $pdo) {}

  // POST /api/login
  public function login(): void
  {
    $data = body();

    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if ($username === '' || $password === '') {
      jsonOut(['ok' => false, 'message' => 'Username and password are required'], 400);
    }

    $stmt = $this->pdo->prepare(
      'SELECT id, username, password_hash, role
       FROM users
       WHERE username = ?'
    );
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password_hash'])) {
      jsonOut(['ok' => false, 'message' => 'Invalid username or password'], 401);
    }

    $_SESSION['user'] = [
      'id' => (int)$user['id'],
      'username' => $user['username'],
      'role' => $user['role']
    ];

    jsonOut(['ok' => true, 'user' => $_SESSION['user']], 200);
  }

  // POST /api/logout
  public function logout(): void
  {
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
      $params = session_get_cookie_params();
      setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
      );
    }

    if (session_status() === PHP_SESSION_ACTIVE) {
      session_destroy();
    }

    jsonOut(['ok' => true], 200);
  }

  // GET /api/me
  public function me(): void
  {
    if (!isset($_SESSION['user'])) {
      jsonOut(['ok' => false], 401);
    }

    jsonOut(['ok' => true, 'user' => $_SESSION['user']], 200);
  }
}