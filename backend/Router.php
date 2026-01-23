<?php

class Router
{
    public function __construct(private PDO $pdo) {}

    public function dispatch(): void
    {
        $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $p = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // ---------------- AUTH: login, logout, session ----------------

        if ($m === 'POST' && $p === '/api/login') {
            (new AuthController($this->pdo))->login();
            return;
        }

        if ($m === 'GET' && $p === '/api/me') {
            (new AuthController($this->pdo))->me();
            return;
        }

        if ($m === 'POST' && $p === '/api/logout') {
            (new AuthController($this->pdo))->logout();
            return;
        }

        // ---------------- SUBJECTS ----------------

        if ($m === 'GET' && $p === '/api/subjects') {
            (new SubjectController($this->pdo))->list();
            return;
        }

        if ($m === 'POST' && $p === '/api/subjects') {
            (new SubjectController($this->pdo))->create();
            return;
        }

        // ---------------- QUESTIONS (Filtered) ----------------
        // GET /api/questions/filter?subject_id=...&difficulty=...&type=...&q=...&limit=...&offset=...

        if ($m === 'GET' && $p === '/api/questions/filter') {
            (new QuestionController($this->pdo))->listFiltered();
            return;
        }

        // ---------------- QUESTIONS (Collection) ----------------
        // GET /api/questions?subject_id=...

        if ($m === 'GET' && $p === '/api/questions') {
            (new QuestionController($this->pdo))->list();
            return;
        }

        if ($m === 'POST' && $p === '/api/questions') {
            (new QuestionController($this->pdo))->create();
            return;
        }

        // ---------------- QUESTIONS (Single /api/questions/{id}) ----------------

        if (preg_match('#^/api/questions/(\d+)$#', $p, $matches)) {
            $id   = (int)$matches[1];
            $ctrl = new QuestionController($this->pdo);

            if ($m === 'GET') {
                $ctrl->show($id);
                return;
            }

            if ($m === 'PUT') {
                $ctrl->update($id);
                return;
            }

            if ($m === 'DELETE') {
                $ctrl->delete($id);
                return;
            }

            http_response_code(405);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'method not allowed']);
            return;
        }

        // ---------------- EXAMS (Collection) ----------------
        // GET /api/exams?subject_id=...

        if ($m === 'GET' && $p === '/api/exams') {
            (new ExamController($this->pdo))->list();
            return;
        }

        // POST /api/exams/auto  -> automatische Generierung
        if ($m === 'POST' && $p === '/api/exams/auto') {
            (new ExamController($this->pdo))->createAuto();
            return;
        }

        // POST /api/exams/manual -> manuelle Auswahl
        if ($m === 'POST' && $p === '/api/exams/manual') {
            (new ExamController($this->pdo))->createManual();
            return;
        }
        // ---------------- EXAMS (Duplicate) ----------------
        // POST /api/exams/{id}/duplicate

        if ($m === 'POST' && preg_match('#^/api/exams/(\d+)/duplicate$#', $p, $matches)) {
            $id = (int)$matches[1];
            (new ExamController($this->pdo))->duplicate($id);
            return;
        }   
        // ---------------- EXAMS (Single /api/exams/{id}) ----------------

        if (preg_match('#^/api/exams/(\d+)$#', $p, $matches)) {
            $id   = (int)$matches[1];
            $ctrl = new ExamController($this->pdo);

            if ($m === 'GET') {
                $ctrl->show($id);
                return;
            }

            if ($m === 'PUT') {
                $ctrl->update($id);
                return;
            }

            if ($m === 'DELETE') {
                $ctrl->delete($id);
                return;
            }

            http_response_code(405);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'method not allowed']);
            return;
        }
    
        // ---------------- USERS ----------------

    // GET /api/users            -> list all users
    if ($m === 'GET' && $p === '/api/users') {
        requireAdmin(); // only admins can see users
        $stmt = $this->pdo->query("SELECT id, username, email, role FROM users ORDER BY id ASC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        header('Content-Type: application/json');
        echo json_encode($users);
        return;
    }

    // POST /api/users           -> create new user
    if ($m === 'POST' && $p === '/api/users') {
        (new UserController($this->pdo))->create();
        return;
    }

    // PUT /api/users/{id}       -> update username/email/role
    if ($m === 'PUT' && preg_match('#^/api/users/(\d+)$#', $p, $matches)) {
        requireAdmin();
        $id = (int)$matches[1];
        $data = json_decode(file_get_contents('php://input'), true);

        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $role     = $data['role'] ?? 'user';

        if (!$username || !$email || !$role) {
            http_response_code(400);
            echo json_encode(['message'=>'Missing fields']);
            return;
        }

        $stmt = $this->pdo->prepare("UPDATE users SET username=?, email=?, role=? WHERE id=?");
        try {
            $stmt->execute([$username, $email, $role, $id]);
            echo json_encode(['ok'=>true]);
        } catch (PDOException $e) {
            http_response_code(409);
            echo json_encode(['message'=>'Error updating user']);
        }
        return;
    }

    // DELETE /api/users/{id}    -> delete user
    if ($m === 'DELETE' && preg_match('#^/api/users/(\d+)$#', $p, $matches)) {
        requireAdmin();
        $id = (int)$matches[1];
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id=?");
        try {
            $stmt->execute([$id]);
            echo json_encode(['ok'=>true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['message'=>'Error deleting user']);
        }
        return;
    }


        // ---------------- FALLBACK: 404 ----------------

        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'not found', 'path' => $p]);
    }
}