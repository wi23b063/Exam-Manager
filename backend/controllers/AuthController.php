<?php

class AuthController
{
    public function __construct(private PDO $pdo) {}

    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true);

        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode([
                'ok' => false,
                'message' => 'Username and password are required'
            ]);
            return;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id, username, password_hash
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

        // SUCCESS
        echo json_encode([
            'ok' => true,
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
            ],
        ]);
    }
}
