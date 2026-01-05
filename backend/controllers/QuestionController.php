<?php

class QuestionController
{
    public function __construct(private PDO $pdo) {}

    /* =========================================================
       LIST FILTERED: Fragen mit Filtern + Suche + Pagination
       GET /questions/filter?subject_id=1&difficulty=easy&type=SCQ&q=foo&limit=50&offset=0
       ========================================================= */
    public function listFiltered(): void
    {
        $subjectId  = isset($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;
        $difficulty = isset($_GET['difficulty']) ? trim((string)$_GET['difficulty']) : '';
        $type       = isset($_GET['type']) ? trim((string)$_GET['type']) : '';
        $q          = isset($_GET['q']) ? trim((string)$_GET['q']) : '';

        $limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        // hard limits / safety
        if ($limit <= 0) $limit = 50;
        if ($limit > 200) $limit = 200;
        if ($offset < 0) $offset = 0;

        $where = [];
        $params = [];

        if ($subjectId > 0) {
            $where[] = "q.subject_id = ?";
            $params[] = $subjectId;
        }

        if ($difficulty !== '') {
            if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
                jsonOut(['error' => 'invalid difficulty'], 422);
            }
            $where[] = "q.difficulty = ?";
            $params[] = $difficulty;
        }

        if ($type !== '') {
            $allowedTypes = ['SCQ', 'MCQ', 'TF', 'SA', 'LA'];
            if (!in_array($type, $allowedTypes, true)) {
                jsonOut(['error' => 'invalid type'], 422);
            }
            $where[] = "q.type = ?";
            $params[] = $type;
        }

        if ($q !== '') {
            $where[] = "q.text LIKE ?";
            $params[] = '%' . $q . '%';
        }

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        // Achtung: LIMIT/OFFSET nicht als Parameter binden (MySQL/PDO je nach Config zickig) -> sauber gecastet einbetten
        $sql = "
            SELECT
              q.id         AS q_id,
              q.text       AS q_text,
              q.difficulty AS q_diff,
              q.type       AS q_type,
              o.id         AS o_id,
              o.idx        AS o_idx,
              o.text       AS o_text,
              o.is_correct AS o_correct
            FROM questions q
            LEFT JOIN options o ON o.question_id = q.id
            $whereSql
            ORDER BY q.id DESC, o.idx ASC
            LIMIT $limit OFFSET $offset
        ";

        $st = $this->pdo->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($rows as $row) {
            $qid = (int)$row['q_id'];

            if (!isset($result[$qid])) {
                $result[$qid] = [
                    'id'         => $qid,
                    'text'       => $row['q_text'],
                    'difficulty' => $row['q_diff'],
                    'type'       => $row['q_type'],
                    'options'    => [],
                ];
            }

            if ($row['o_id'] !== null) {
                $result[$qid]['options'][] = [
                    'id'         => (int)$row['o_id'],
                    'idx'        => (int)$row['o_idx'],
                    'text'       => $row['o_text'],
                    'is_correct' => (int)$row['o_correct'],
                ];
            }
        }

        $result = array_values($result);

        jsonOut([
            'data'   => $result,
            'limit'  => $limit,
            'offset' => $offset
        ]);
    }

    /* =========================================================
       LIST: alle Fragen eines Faches (ohne JSON_ARRAYAGG)
       GET /questions?subject_id=1
       ========================================================= */
    public function list(): void
    {
        $subjectId = isset($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;
        if ($subjectId <= 0) {
            jsonOut(['error' => 'subject_id required'], 422);
        }

        $st = $this->pdo->prepare("
            SELECT
              q.id         AS q_id,
              q.text       AS q_text,
              q.difficulty AS q_diff,
              q.type       AS q_type,
              o.id         AS o_id,
              o.idx        AS o_idx,
              o.text       AS o_text,
              o.is_correct AS o_correct
            FROM questions q
            LEFT JOIN options o ON o.question_id = q.id
            WHERE q.subject_id = ?
            ORDER BY q.id DESC, o.idx ASC
        ");
        $st->execute([$subjectId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($rows as $row) {
            $qid = (int)$row['q_id'];

            if (!isset($result[$qid])) {
                $result[$qid] = [
                    'id'         => $qid,
                    'text'       => $row['q_text'],
                    'difficulty' => $row['q_diff'],
                    'type'       => $row['q_type'],
                    'options'    => [],
                ];
            }

            if ($row['o_id'] !== null) {
                $result[$qid]['options'][] = [
                    'id'         => (int)$row['o_id'],
                    'idx'        => (int)$row['o_idx'],
                    'text'       => $row['o_text'],
                    'is_correct' => (int)$row['o_correct'],
                ];
            }
        }

        // numerisch indizieren
        $result = array_values($result);
        jsonOut($result);
    }

    /* =========================================================
       CREATE
       ========================================================= */
    public function create(): void
    {
        $d = body();
        // expected: text, difficulty, subject_id, type, options[]{text, is_correct}
        $errors = [];

        if (!isset($d['text']) || trim($d['text']) === '') {
            $errors[] = 'text';
        }

        if (!in_array($d['difficulty'] ?? '', ['easy', 'medium', 'hard'], true)) {
            $errors[] = 'difficulty';
        }

        $sid = (int)($d['subject_id'] ?? 0);
        if ($sid <= 0) {
            $errors[] = 'subject_id';
        }

        // type validieren
        $type = $d['type'] ?? 'SCQ';  // Default: Single Choice
        $allowedTypes = ['SCQ', 'MCQ', 'TF', 'SA', 'LA'];
        if (!in_array($type, $allowedTypes, true)) {
            $errors[] = 'type';
        }

        // ---------------- Optionen validieren (SCQ / MCQ / TF / SA / LA) ----------------
        $options = $d['options'] ?? null;
        if (!is_array($options)) {
            $errors[] = 'options';
        } else {
            $count = count($options);

            if ($type === 'TF') {
                // True/False: genau 2 Optionen erwartet
                if ($count !== 2) {
                    $errors[] = 'options(2)';
                }
            } elseif ($type === 'SA' || $type === 'LA') {
                // Short/Long Answer: genau 1 "Lösungs"-Eintrag
                if ($count !== 1) {
                    $errors[] = 'options(1)';
                }
            } else {
                // SCQ, MCQ → 4 Optionen
                if ($count !== 4) {
                    $errors[] = 'options(4)';
                }
            }

            $correctCount = array_sum(array_map(
                fn($o) => !empty($o['is_correct']) ? 1 : 0,
                $options
            ));

            // Für SCQ: genau eine richtige
            if ($type === 'SCQ' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (SCQ)';
            }

            // Für MCQ: mindestens eine richtige
            if ($type === 'MCQ' && $correctCount < 1) {
                $errors[] = 'at least one option must be correct (MCQ)';
            }

            // Für TF: genau eine richtige
            if ($type === 'TF' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (TF)';
            }

            // Für SA: genau eine richtige
            if ($type === 'SA' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (SA)';
            }

            // Für LA: genau eine richtige (Musterlösung)
            if ($type === 'LA' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (LA)';
            }

            foreach ($options as $o) {
                if (trim($o['text'] ?? '') === '') {
                    $errors[] = 'option text';
                }
            }
        }

        // ----------------------------------------------------------------------

        if ($errors) {
            jsonOut(['error' => 'validation', 'fields' => $errors], 422);
        }

        $this->pdo->beginTransaction();

        $st = $this->pdo->prepare("
            INSERT INTO questions(subject_id, type, text, difficulty)
            VALUES (?,?,?,?)
        ");
        $st->execute([$sid, $type, trim($d['text']), $d['difficulty']]);
        $qid = (int)$this->pdo->lastInsertId();

        $st2 = $this->pdo->prepare("
            INSERT INTO options(question_id, idx, text, is_correct)
            VALUES (?,?,?,?)
        ");
        foreach ($options as $i => $o) {
            $st2->execute([
                $qid,
                $i,
                trim($o['text']),
                !empty($o['is_correct']) ? 1 : 0
            ]);
        }

        $this->pdo->commit();
        jsonOut(['id' => $qid], 201);
    }

    /* =========================================================
       DELETE
       ========================================================= */
    public function delete(int $id): void
    {
        if ($id <= 0) {
            jsonOut(['error' => 'invalid id'], 400);
        }

        try {
            $this->pdo->beginTransaction();

            $stOpt = $this->pdo->prepare("DELETE FROM options WHERE question_id = ?");
            $stOpt->execute([$id]);

            $stQ = $this->pdo->prepare("DELETE FROM questions WHERE id = ?");
            $stQ->execute([$id]);

            $this->pdo->commit();

            if ($stQ->rowCount() === 0) {
                jsonOut(['error' => 'not found'], 404);
            } else {
                jsonOut(null, 204);
            }
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log($e);
            jsonOut(['error' => 'internal error'], 500);
        }
    }

    /* =========================================================
       SHOW: einzelne Frage (ohne JSON_ARRAYAGG)
       GET /questions/{id}
       ========================================================= */
    public function show(int $id): void
    {
        if ($id <= 0) {
            jsonOut(['error' => 'invalid id'], 400);
        }

        $st = $this->pdo->prepare("
            SELECT
              q.id         AS q_id,
              q.subject_id AS q_subject_id,
              q.text       AS q_text,
              q.difficulty AS q_diff,
              q.type       AS q_type,
              o.id         AS o_id,
              o.idx        AS o_idx,
              o.text       AS o_text,
              o.is_correct AS o_correct
            FROM questions q
            LEFT JOIN options o ON o.question_id = q.id
            WHERE q.id = ?
            ORDER BY o.idx ASC
        ");
        $st->execute([$id]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) {
            jsonOut(['error' => 'not found'], 404);
        }

        $first = $rows[0];
        $question = [
            'id'         => (int)$first['q_id'],
            'subject_id' => (int)$first['q_subject_id'],
            'text'       => $first['q_text'],
            'difficulty' => $first['q_diff'],
            'type'       => $first['q_type'],
            'options'    => [],
        ];

        foreach ($rows as $row) {
            if ($row['o_id'] === null) continue;
            $question['options'][] = [
                'id'         => (int)$row['o_id'],
                'idx'        => (int)$row['o_idx'],
                'text'       => $row['o_text'],
                'is_correct' => (int)$row['o_correct'],
            ];
        }

        jsonOut($question);
    }

    /* =========================================================
       UPDATE
       ========================================================= */
    public function update(int $id): void
    {
        if ($id <= 0) {
            jsonOut(['error' => 'invalid id'], 400);
        }

        $d = body(); // same as in create()
        $errors = [];

        if (!isset($d['text']) || trim($d['text']) === '') {
            $errors[] = 'text';
        }

        if (!in_array($d['difficulty'] ?? '', ['easy', 'medium', 'hard'], true)) {
            $errors[] = 'difficulty';
        }

        $sid = (int)($d['subject_id'] ?? 0);
        if ($sid <= 0) {
            $errors[] = 'subject_id';
        }

        // type validieren (wie in create)
        $type = $d['type'] ?? 'SCQ';
        $allowedTypes = ['SCQ', 'MCQ', 'TF', 'SA', 'LA'];
        if (!in_array($type, $allowedTypes, true)) {
            $errors[] = 'type';
        }

        // ---------------- Optionen validieren (SCQ / MCQ / TF / SA / LA) ----------------
        $options = $d['options'] ?? null;
        if (!is_array($options)) {
            $errors[] = 'options';
        } else {
            $count = count($options);

            if ($type === 'TF') {
                if ($count !== 2) {
                    $errors[] = 'options(2)';
                }
            } elseif ($type === 'SA' || $type === 'LA') {
                if ($count !== 1) {
                    $errors[] = 'options(1)';
                }
            } else {
                if ($count !== 4) {
                    $errors[] = 'options(4)';
                }
            }

            $correctCount = array_sum(array_map(
                fn($o) => !empty($o['is_correct']) ? 1 : 0,
                $options
            ));

            if ($type === 'SCQ' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (SCQ)';
            }

            if ($type === 'MCQ' && $correctCount < 1) {
                $errors[] = 'at least one option must be correct (MCQ)';
            }

            if ($type === 'TF' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (TF)';
            }

            if ($type === 'SA' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (SA)';
            }

            if ($type === 'LA' && $correctCount !== 1) {
                $errors[] = 'exactly one option must be correct (LA)';
            }

            foreach ($options as $o) {
                if (trim($o['text'] ?? '') === '') {
                    $errors[] = 'option text';
                }
            }
        }
        // ----------------------------------------------------------------------

        if ($errors) {
            jsonOut(['error' => 'validation', 'fields' => $errors], 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Hauptfrage updaten
            $st = $this->pdo->prepare("
                UPDATE questions
                SET subject_id = ?, type = ?, text = ?, difficulty = ?
                WHERE id = ?
            ");
            $st->execute([$sid, $type, trim($d['text']), $d['difficulty'], $id]);

            if ($st->rowCount() === 0) {
                // Kann heißen: ID existiert nicht ODER Daten waren identisch.
                // Wir prüfen explizit, ob die Frage existiert:
                $check = $this->pdo->prepare("SELECT id FROM questions WHERE id = ?");
                $check->execute([$id]);
                if (!$check->fetch()) {
                    $this->pdo->rollBack();
                    jsonOut(['error' => 'not found'], 404);
                }
                // Wenn sie existiert, machen wir trotzdem weiter (Optionen neu schreiben).
            }

            // Optionen ersetzen
            $stDel = $this->pdo->prepare("DELETE FROM options WHERE question_id = ?");
            $stDel->execute([$id]);

            $st2 = $this->pdo->prepare("
                INSERT INTO options(question_id, idx, text, is_correct)
                VALUES (?,?,?,?)
            ");
            foreach ($options as $i => $o) {
                $st2->execute([
                    $id,
                    $i,
                    trim($o['text']),
                    !empty($o['is_correct']) ? 1 : 0
                ]);
            }

            $this->pdo->commit();
            jsonOut(['id' => $id], 200);
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log($e);
            jsonOut(['error' => 'internal error'], 500);
        }
    }
}
