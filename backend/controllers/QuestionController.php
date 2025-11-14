<?php
class QuestionController {
  public function __construct(private PDO $pdo) {}

  public function list(): void {
    $subjectId = isset($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;
    if ($subjectId <= 0) jsonOut(['error'=>'subject_id required'], 422);
    $q = $this->pdo->prepare("
      SELECT q.id, q.text, q.difficulty,
             JSON_ARRAYAGG(JSON_OBJECT('id',o.id,'idx',o.idx,'text',o.text,'is_correct',o.is_correct)) AS options
      FROM questions q
      JOIN options o ON o.question_id=q.id
      WHERE q.subject_id=?
      GROUP BY q.id
      ORDER BY q.id DESC
    ");
    $q->execute([$subjectId]);
    $rows = $q->fetchAll();
    foreach ($rows as &$r) $r['options'] = json_decode($r['options'], true);
    jsonOut($rows);
  }

  public function create(): void {
    $d = body();
    // expected: text, difficulty (easy|medium|hard), subject_id, options[4]{text, is_correct}
    $errors = [];
    if (!isset($d['text']) || trim($d['text'])==='') $errors[]='text';
    if (!in_array($d['difficulty']??'', ['easy','medium','hard'], true)) $errors[]='difficulty';
    $sid = (int)($d['subject_id'] ?? 0); if ($sid<=0) $errors[]='subject_id';
    if (!isset($d['options']) || count($d['options'])!==4) $errors[]='options(4)';
    else {
      $correct = array_sum(array_map(fn($o)=>!empty($o['is_correct'])?1:0, $d['options']));
      if ($correct!==1) $errors[]='exactly one option must be correct';
      foreach ($d['options'] as $o) if (trim($o['text']??'')==='') $errors[]='option text';
    }
    if ($errors) jsonOut(['error'=>'validation','fields'=>$errors], 422);

    $this->pdo->beginTransaction();
    $st = $this->pdo->prepare("INSERT INTO questions(subject_id,text,difficulty) VALUES (?,?,?)");
    $st->execute([$sid, trim($d['text']), $d['difficulty']]);
    $qid = (int)$this->pdo->lastInsertId();

    $st2 = $this->pdo->prepare("INSERT INTO options(question_id, idx, text, is_correct) VALUES (?,?,?,?)");
    foreach ($d['options'] as $i=>$o) $st2->execute([$qid, $i, trim($o['text']), !empty($o['is_correct'])?1:0]);

    $this->pdo->commit();
    jsonOut(['id'=>$qid], 201);
  }
}
