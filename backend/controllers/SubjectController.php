<?php
class SubjectController {
  public function __construct(private PDO $pdo) {}
  public function list(): void {
    $rows = $this->pdo->query("SELECT id,name FROM subjects ORDER BY name")->fetchAll();
    jsonOut($rows);
  }
  public function create(): void {
    $name = trim((body()['name'] ?? ''));
    if ($name==='') jsonOut(['error'=>'name required'], 422);
    $st = $this->pdo->prepare("INSERT INTO subjects(name) VALUES (?)");
    $st->execute([$name]);
    jsonOut(['id'=>$this->pdo->lastInsertId(), 'name'=>$name], 201);
  }
}
