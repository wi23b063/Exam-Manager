<?php
class UserController
{
    public function __construct(private PDO $pdo) {}

    // POST /api/users
    public function create(): void
    {
        requireAdmin();

        $data = body();

        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $role     = $data['role'] ?? 'viewer';

        if ($username === '' || $email === '' || $password === '') {
            jsonOut(['ok' => false, 'message' => 'Missing fields'], 400);
        }

        // Rollen validieren
        if (!in_array($role, ['admin', 'editor', 'viewer'], true)) {
            jsonOut(['ok' => false, 'message' => 'Invalid role'], 422);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->pdo->prepare(
            "INSERT INTO users (username, email, password_hash, role)
             VALUES (?, ?, ?, ?)"
        );

        try {
            $stmt->execute([$username, $email, $hash, $role]);
        } catch (PDOException $e) {
            // UNIQUE constraint -> username/email existiert
            jsonOut(['ok' => false, 'message' => 'User already exists'], 409);
        }

        jsonOut(['ok' => true], 201);
    }
}