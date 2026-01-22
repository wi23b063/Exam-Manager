<?php
class UserController {
    public function __construct(private PDO $pdo) {}

    public function create(): void
    {
        requireAdmin();

        $data = json_decode(file_get_contents('php://input'), true);

        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'viewer';

        if (!$username || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['message' => 'Missing fields']);
            return;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->pdo->prepare(
            "INSERT INTO users (username, email, password_hash, role)
             VALUES (?, ?, ?, ?)"
        );

        try {
            $stmt->execute([$username, $email, $hash, $role]);
        } catch (PDOException $e) {
            http_response_code(409);
            echo json_encode(['message' => 'User already exists']);
            return;
        }

        echo json_encode(['ok' => true]);
    }
}
