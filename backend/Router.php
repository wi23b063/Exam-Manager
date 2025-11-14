<?php
class Router {
  public function __construct(private PDO $pdo) {}
  public function dispatch(): void {
    $m = $_SERVER['REQUEST_METHOD'];
    $p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Subjects
    if ($m==='GET' && $p==='/api/subjects') (new SubjectController($this->pdo))->list();
    if ($m==='POST'&& $p==='/api/subjects') (new SubjectController($this->pdo))->create();

    // Questions
    if ($m==='GET' && $p==='/api/questions') (new QuestionController($this->pdo))->list();
    if ($m==='POST'&& $p==='/api/questions') (new QuestionController($this->pdo))->create();

    http_response_code(404); echo 'Not found';
  }
}
