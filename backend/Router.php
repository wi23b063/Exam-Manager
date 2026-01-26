<?php

class Router
{
    public function __construct(private PDO $pdo) {}

    public function dispatch(): void
    {
        $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $p = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // ---------------- AUTH ----------------
        if ($m === 'POST' && $p === '/api/login') {
            (new AuthController($this->pdo))->login();
        }

        if ($m === 'GET' && $p === '/api/me') {
            (new AuthController($this->pdo))->me();
        }

        if ($m === 'POST' && $p === '/api/logout') {
            (new AuthController($this->pdo))->logout();
        }

        // Everything below requires login
        // (optional but recommended — comment out if you want public read)
        if (!in_array($p, ['/api/login', '/api/me', '/api/logout'], true)) {
            requireLogin();
        }

        // ---------------- SUBJECTS ----------------
        if ($m === 'GET' && $p === '/api/subjects') {
            (new SubjectController($this->pdo))->list();
        }

        if ($m === 'POST' && $p === '/api/subjects') {
            // Only editor/admin create subjects (optional)
            requireEditorOrAdmin();
            (new SubjectController($this->pdo))->create();
        }

        // ---------------- QUESTIONS (Filtered) ----------------
        if ($m === 'GET' && $p === '/api/questions/filter') {
            (new QuestionController($this->pdo))->listFiltered();
        }

        // ---------------- QUESTIONS (Collection) ----------------
        if ($m === 'GET' && $p === '/api/questions') {
            (new QuestionController($this->pdo))->list();
        }

        if ($m === 'POST' && $p === '/api/questions') {
            requireEditorOrAdmin();
            (new QuestionController($this->pdo))->create();
        }

        // ---------------- QUESTIONS (Single) ----------------
        if (preg_match('#^/api/questions/(\d+)$#', $p, $matches)) {
            $id   = (int)$matches[1];
            $ctrl = new QuestionController($this->pdo);

            if ($m === 'GET') {
                $ctrl->show($id);
            }

            if ($m === 'PUT') {
                requireEditorOrAdmin();
                $ctrl->update($id);
            }

            if ($m === 'DELETE') {
                requireEditorOrAdmin();
                $ctrl->delete($id);
            }

            jsonOut(['error' => 'method not allowed'], 405);
        }

        // ---------------- EXAMS (Collection) ----------------
        if ($m === 'GET' && $p === '/api/exams') {
            (new ExamController($this->pdo))->list();
        }

        if ($m === 'POST' && $p === '/api/exams/auto') {
            requireEditorOrAdmin();
            (new ExamController($this->pdo))->createAuto();
        }

        if ($m === 'POST' && $p === '/api/exams/manual') {
            requireEditorOrAdmin();
            (new ExamController($this->pdo))->createManual();
        }

        // Duplicate
        if ($m === 'POST' && preg_match('#^/api/exams/(\d+)/duplicate$#', $p, $matches)) {
            requireEditorOrAdmin();
            $id = (int)$matches[1];
            (new ExamController($this->pdo))->duplicate($id);
        }

        // ---------------- EXAMS (Single) ----------------
        if (preg_match('#^/api/exams/(\d+)$#', $p, $matches)) {
            $id   = (int)$matches[1];
            $ctrl = new ExamController($this->pdo);

            if ($m === 'GET') {
                $ctrl->show($id);
            }

            if ($m === 'PUT') {
                requireEditorOrAdmin();
                $ctrl->update($id);
            }

            if ($m === 'DELETE') {
                requireEditorOrAdmin();
                $ctrl->delete($id);
            }

            jsonOut(['error' => 'method not allowed'], 405);
        }

        // ---------------- USERS (admin only) ----------------
        if ($m === 'GET' && $p === '/api/users') {
            requireAdmin();
            $stmt = $this->pdo->query("SELECT id, username, email, role FROM users ORDER BY id ASC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            jsonOut($users, 200);
        }

        if ($m === 'POST' && $p === '/api/users') {
            requireAdmin();
            (new UserController($this->pdo))->create();
        }

        if ($m === 'PUT' && preg_match('#^/api/users/(\d+)$#', $p, $matches)) {
            requireAdmin();
            $id = (int)$matches[1];
            $data = body();

            $username = trim($data['username'] ?? '');
            $email    = trim($data['email'] ?? '');
            $role     = $data['role'] ?? 'viewer';

            if ($username === '' || $email === '' || $role === '') {
                jsonOut(['message' => 'Missing fields'], 400);
            }

            if (!in_array($role, ['admin', 'editor', 'viewer'], true)) {
                jsonOut(['message' => 'Invalid role'], 422);
            }

            $stmt = $this->pdo->prepare("UPDATE users SET username=?, email=?, role=? WHERE id=?");
            try {
                $stmt->execute([$username, $email, $role, $id]);
                jsonOut(['ok' => true], 200);
            } catch (PDOException $e) {
                jsonOut(['message' => 'Error updating user'], 409);
            }
        }

        if ($m === 'DELETE' && preg_match('#^/api/users/(\d+)$#', $p, $matches)) {
            requireAdmin();
            $id = (int)$matches[1];

            $stmt = $this->pdo->prepare("DELETE FROM users WHERE id=?");
            try {
                $stmt->execute([$id]);
                jsonOut(['ok' => true], 200);
            } catch (PDOException $e) {
                jsonOut(['message' => 'Error deleting user'], 500);
            }
        }

        // ---------------- FALLBACK 404 ----------------
        jsonOut(['error' => 'not found', 'path' => $p], 404);
    }
}