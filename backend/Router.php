<?php
class Router {
  public function __construct(private PDO $pdo) {}

  public function dispatch(): void {
    $m = $_SERVER['REQUEST_METHOD'];
    $p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Subjects
    if ($m === 'GET'  && $p === '/api/subjects') {
      (new SubjectController($this->pdo))->list();
      return;
    }

    if ($m === 'POST' && $p === '/api/subjects') {
      (new SubjectController($this->pdo))->create();
      return;
    }

    // Questions collection
    if ($m === 'GET'  && $p === '/api/questions') {
      (new QuestionController($this->pdo))->list();
      return;
    }

    if ($m === 'POST' && $p === '/api/questions') {
      (new QuestionController($this->pdo))->create();
      return;
    }

    // Questions single item: /api/questions/{id}
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
      echo 'Method not allowed';
      return;
    }

    http_response_code(404);
    echo 'Not found';
  }
}