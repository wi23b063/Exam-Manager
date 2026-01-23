<?php

class AuthController
{
    public function __construct(private PDO $pdo) {}

    // log-in
    public function login(): void {
        $data = json_decode(file_get_contents('php://input'), true);

        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'viewer';

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'message' => 'Username and password are required'
            ]);
            return;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id, username, password_hash, role
             FROM users
             WHERE username = ?'
        );
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            http_response_code(401);
            echo json_encode([
                'ok' => false,
                'message' => 'Invalid username or password'
            ]);
            return;
        }

        $_SESSION['user'] = [
            'id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role']
        ];

        echo json_encode([
            'ok' => true,
            'user' => $_SESSION['user']
        ]);
    }

    // log-out
    public function logout(): void {
    session_destroy();
    echo json_encode(['ok' => true]);
    }   

    // session
    public function me(): void {
        if (!isset($_SESSION['user'])) {
            http_response_code(401);
            echo json_encode(['ok' => false]);
            return;
        }

        echo json_encode([
            'ok' => true,
            'user' => $_SESSION['user']
        ]);
    }
}
