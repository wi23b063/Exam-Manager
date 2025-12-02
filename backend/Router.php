<?php

class Router
{
    public function __construct(private PDO $pdo) {}

    public function dispatch(): void
    {
        $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $p = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // ---------------- SUBJECTS ----------------

        if ($m === 'GET' && $p === '/api/subjects') {
            (new SubjectController($this->pdo))->list();
            return;
        }

        if ($m === 'POST' && $p === '/api/subjects') {
            (new SubjectController($this->pdo))->create();
            return;
        }

        // ---------------- QUESTIONS (Collection) ----------------

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

        // ---------------- FALLBACK: 404 ----------------

        http_response_code(404);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'not found', 'path' => $p]);
    }
}