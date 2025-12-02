<?php

class ExamController
{
    public function __construct(private PDO $pdo) {}

    /**
     * Liste aller Exams eines Faches
     * GET /api/exams?subject_id=1
     */
    public function list(): void
    {
        $subjectId = isset($_GET['subject_id']) ? (int)$_GET['subject_id'] : 0;
        if ($subjectId <= 0) {
            jsonOut(['error' => 'subject_id required'], 422);
        }

        $st = $this->pdo->prepare("
            SELECT id, subject_id, name, mode, base_difficulty, question_count, created_at
            FROM exams
            WHERE subject_id = ?
            ORDER BY created_at DESC
        ");
        $st->execute([$subjectId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        jsonOut($rows);
    }

    /**
     * Einzelnes Exam inkl. Fragen + Optionen
     * GET /api/exams/{id}
     */
    public function show(int $id): void
    {
        if ($id <= 0) {
            jsonOut(['error' => 'invalid id'], 400);
        }

        $st = $this->pdo->prepare("
            SELECT id, subject_id, name, mode, base_difficulty, question_count, created_at
            FROM exams
            WHERE id = ?
        ");
        $st->execute([$id]);
        $exam = $st->fetch(PDO::FETCH_ASSOC);

        if (!$exam) {
            jsonOut(['error' => 'not found'], 404);
        }

        // Fragen + Optionen laden
        $q = $this->pdo->prepare("
            SELECT
              q.id,
              q.text,
              q.difficulty,
              q.type,
              eq.position,
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', o.id,
                  'idx', o.idx,
                  'text', o.text,
                  'is_correct', o.is_correct
                )
              ) AS options
            FROM exam_questions eq
            JOIN questions q ON q.id = eq.question_id
            LEFT JOIN options o ON o.question_id = q.id
            WHERE eq.exam_id = ?
            GROUP BY q.id, eq.position
            ORDER BY eq.position ASC
        ");
        $q->execute([$id]);
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);

        $counts = [
            'easy'   => 0,
            'medium' => 0,
            'hard'   => 0,
        ];

        foreach ($rows as &$r) {
            $r['options'] = json_decode($r['options'], true);
            $diff = $r['difficulty'] ?? '';
            if (isset($counts[$diff])) {
                $counts[$diff]++;
            }
        }
        unset($r);

        $exam['questions'] = $rows;
        $exam['counts']    = $counts; // fürs Frontend zum Vorbefüllen

        jsonOut($exam);
    }

    /**
     * MANUELL: Prüfungsfragen werden explizit übergeben
     * POST /api/exams/manual
     * Body: { subject_id, name, question_ids: [1,2,3] }
     */
    public function createManual(): void
    {
        $d = body();
        $errors = [];

        $subjectId = (int)($d['subject_id'] ?? 0);
        if ($subjectId <= 0) {
            $errors[] = 'subject_id';
        }

        $name = trim($d['name'] ?? '');
        if ($name === '') {
            $errors[] = 'name';
        }

        $questionIds = $d['question_ids'] ?? null;
        if (!is_array($questionIds) || count($questionIds) === 0) {
            $errors[] = 'question_ids';
        }

        if ($errors) {
            jsonOut(['error' => 'validation', 'fields' => $errors], 422);
        }

        // Optional: prüfen, ob alle Fragen zu diesem Fach gehören
        $placeholders = implode(',', array_fill(0, count($questionIds), '?'));
        $check = $this->pdo->prepare("
            SELECT COUNT(*) FROM questions
            WHERE id IN ($placeholders) AND subject_id = ?
        ");
        $params = array_map('intval', $questionIds);
        $params[] = $subjectId;
        $check->execute($params);
        $cnt = (int)$check->fetchColumn();

        if ($cnt !== count($questionIds)) {
            jsonOut(['error' => 'some questions do not belong to subject'], 422);
        }

        try {
            $this->pdo->beginTransaction();

            $stExam = $this->pdo->prepare("
                INSERT INTO exams (subject_id, name, mode, base_difficulty, question_count)
                VALUES (?,?,?,?,?)
            ");
            $stExam->execute([
                $subjectId,
                $name,
                'manual',
                null,
                count($questionIds)
            ]);
            $examId = (int)$this->pdo->lastInsertId();

            $stLink = $this->pdo->prepare("
                INSERT INTO exam_questions (exam_id, question_id, position)
                VALUES (?,?,?)
            ");

            $pos = 1;
            foreach ($questionIds as $qid) {
                $stLink->execute([$examId, (int)$qid, $pos++]);
            }

            $this->pdo->commit();
            jsonOut(['id' => $examId, 'name' => $name], 201);
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log($e);
            jsonOut(['error' => 'internal error'], 500);
        }
    }

    /**
     * AUTOMATISCH: Fragen werden zufällig nach Verteilung der Schwierigkeitsgrade gezogen
     * POST /api/exams/auto
     * Body: {
     *   subject_id,
     *   name,
     *   counts: { easy: 3, medium: 5, hard: 2 }
     * }
     */
    public function createAuto(): void
    {
        $d = body();
        $errors = [];

        $subjectId = (int)($d['subject_id'] ?? 0);
        if ($subjectId <= 0) {
            $errors[] = 'subject_id';
        }

        $name = trim($d['name'] ?? '');
        if ($name === '') {
            $errors[] = 'name';
        }

        $counts = $d['counts'] ?? null;
        if (!is_array($counts)) {
            $errors[] = 'counts';
        } else {
            $counts = [
                'easy'   => (int)($counts['easy']   ?? 0),
                'medium' => (int)($counts['medium'] ?? 0),
                'hard'   => (int)($counts['hard']   ?? 0),
            ];
            foreach ($counts as $k => $v) {
                if ($v < 0) {
                    $errors[] = "counts.$k";
                }
            }
        }

        $total = is_array($counts ?? null) ? array_sum($counts) : 0;
        if ($total <= 0) {
            $errors[] = 'counts.total';
        }

        if ($errors) {
            jsonOut(['error' => 'validation', 'fields' => $errors], 422);
        }

        $questionIds = $this->pickQuestionsForCounts($subjectId, $counts);

        try {
            $this->pdo->beginTransaction();

            $stExam = $this->pdo->prepare("
                INSERT INTO exams (subject_id, name, mode, base_difficulty, question_count)
                VALUES (?,?,?,?,?)
            ");
            $stExam->execute([
                $subjectId,
                $name,
                'auto',
                null,
                $total
            ]);
            $examId = (int)$this->pdo->lastInsertId();

            $this->insertExamQuestions($examId, $questionIds);

            $this->pdo->commit();
            jsonOut(['id' => $examId, 'name' => $name], 201);
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log($e);
            jsonOut(['error' => 'internal error'], 500);
        }
    }

    /**
     * BEARBEITEN
     * PUT /api/exams/{id}
     *
     * Variante A: Frage-IDs direkt vorgeben
     *   Body: { name?, question_ids: [...] }
     *
     * Variante B: Prüfung neu automatisch generieren
     *   Body: { name?, counts: { easy, medium, hard } }
     */
    public function update(int $id): void
    {
        if ($id <= 0) {
            jsonOut(['error' => 'invalid id'], 400);
        }

        $d = body();
        $errors = [];

        $name        = isset($d['name']) ? trim($d['name']) : null;
        $questionIds = $d['question_ids'] ?? null;
        $counts      = $d['counts'] ?? null;

        if ($name !== null && $name === '') {
            $errors[] = 'name';
        }

        if (!$questionIds && !$counts) {
            $errors[] = 'question_ids_or_counts_required';
        }

        // Exam laden (brauchen wir u.a. für subject_id)
        $stExam = $this->pdo->prepare("SELECT id, subject_id, mode FROM exams WHERE id = ?");
        $stExam->execute([$id]);
        $examRow = $stExam->fetch(PDO::FETCH_ASSOC);
        if (!$examRow) {
            jsonOut(['error' => 'not found'], 404);
        }
        $subjectId = (int)$examRow['subject_id'];

        // Wenn counts übergeben wurde → wie createAuto, aber bestehendes Exam überschreiben
        if (is_array($counts) && !$questionIds) {
            $counts = [
                'easy'   => (int)($counts['easy']   ?? 0),
                'medium' => (int)($counts['medium'] ?? 0),
                'hard'   => (int)($counts['hard']   ?? 0),
            ];
            foreach ($counts as $k => $v) {
                if ($v < 0) {
                    $errors[] = "counts.$k";
                }
            }
            $total = array_sum($counts);
            if ($total <= 0) {
                $errors[] = 'counts.total';
            }

            if ($errors) {
                jsonOut(['error' => 'validation', 'fields' => $errors], 422);
            }

            $questionIds = $this->pickQuestionsForCounts($subjectId, $counts);
        }

        // Variante A oder B: wir haben auf jeden Fall eine Liste von question_ids
        if (!is_array($questionIds) || count($questionIds) === 0) {
            $errors[] = 'question_ids';
        }

        if ($errors) {
            jsonOut(['error' => 'validation', 'fields' => $errors], 422);
        }

        try {
            $this->pdo->beginTransaction();

            // Exam-Datensatz aktualisieren
            $qCount = count($questionIds);
            if ($name !== null) {
                $st = $this->pdo->prepare("
                    UPDATE exams
                    SET name = ?, question_count = ?
                    WHERE id = ?
                ");
                $st->execute([$name, $qCount, $id]);
            } else {
                $st = $this->pdo->prepare("
                    UPDATE exams
                    SET question_count = ?
                    WHERE id = ?
                ");
                $st->execute([$qCount, $id]);
            }

            // Alte Verknüpfungen löschen & neu einfügen
            $del = $this->pdo->prepare("DELETE FROM exam_questions WHERE exam_id = ?");
            $del->execute([$id]);

            $this->insertExamQuestions($id, array_map('intval', $questionIds));

            $this->pdo->commit();
            jsonOut(['id' => $id], 200);
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            error_log($e);
            jsonOut(['error' => 'internal error'], 500);
        }
    }

    /**
     * DELETE /api/exams/{id}
     */
    public function delete(int $id): void
    {
        if ($id <= 0) {
            jsonOut(['error' => 'invalid id'], 400);
        }

        try {
            $st = $this->pdo->prepare("DELETE FROM exams WHERE id = ?");
            $st->execute([$id]);

            if ($st->rowCount() === 0) {
                jsonOut(['error' => 'not found'], 404);
            } else {
                // exam_questions werden über FK ON DELETE CASCADE gelöscht
                jsonOut(null, 204);
            }
        } catch (Throwable $e) {
            error_log($e);
            jsonOut(['error' => 'internal error'], 500);
        }
    }

    /* ===========================================================
       Hilfsfunktionen
       =========================================================== */

    /**
     * Fragen für eine gegebene Verteilung der Schwierigkeitsgrade ziehen.
     * Gibt ein Array von question_ids zurück.
     */
    private function pickQuestionsForCounts(int $subjectId, array $counts): array
    {
        $questionIds = [];

        foreach ($counts as $difficulty => $cnt) {
            if ($cnt <= 0) {
                continue;
            }

            $st = $this->pdo->prepare("
                SELECT id
                FROM questions
                WHERE subject_id = :sid AND difficulty = :diff
                ORDER BY RAND()
                LIMIT :cnt
            ");
            $st->bindValue(':sid', $subjectId, PDO::PARAM_INT);
            $st->bindValue(':diff', $difficulty, PDO::PARAM_STR);
            $st->bindValue(':cnt', $cnt, PDO::PARAM_INT);
            $st->execute();
            $ids = $st->fetchAll(PDO::FETCH_COLUMN);

            if (count($ids) < $cnt) {
                jsonOut([
                    'error'     => "not enough questions for difficulty $difficulty",
                    'requested' => $cnt,
                    'available' => count($ids),
                ], 422);
            }

            $questionIds = array_merge($questionIds, array_map('intval', $ids));
        }

        // Mischung der Reihenfolge
        shuffle($questionIds);

        return $questionIds;
    }

    /**
     * question_ids in exam_questions mit Positionsfeld eintragen.
     */
    private function insertExamQuestions(int $examId, array $questionIds): void
    {
        $stLink = $this->pdo->prepare("
            INSERT INTO exam_questions (exam_id, question_id, position)
            VALUES (?,?,?)
        ");

        $pos = 1;
        foreach ($questionIds as $qid) {
            $stLink->execute([$examId, (int)$qid, $pos++]);
        }
    }
}
