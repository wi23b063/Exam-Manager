CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Beispiel-Startwerte
INSERT IGNORE INTO subjects(name) VALUES ('Maths'), ('Computer Science'), ('Physics');


CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  type ENUM('SCQ','MCQ','TF','SA','LA') NOT NULL, -- Single Choice Question, Multiple Choice Question, True/False, Short Answer, Long Answer
  text VARCHAR(500) NOT NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_q_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  idx TINYINT NOT NULL,             
  text VARCHAR(300) NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_q_idx (question_id, idx),
  CONSTRAINT fk_o_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  mode ENUM('manual','auto') NOT NULL,
  base_difficulty ENUM('easy','medium','hard') DEFAULT NULL,
  question_count INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_exam_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS exam_questions (
  exam_id INT NOT NULL,
  question_id INT NOT NULL,
  position INT NOT NULL,
  PRIMARY KEY (exam_id, question_id),
  CONSTRAINT fk_eq_exam
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_eq_question
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

/* =========================================================
   SAMPLE DATA RESET
   (Run AFTER schema / subjects inserts)
   ========================================================= */

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM exam_questions;
DELETE FROM exams;
DELETE FROM options;
DELETE FROM questions;

SET FOREIGN_KEY_CHECKS = 1;


/* =========================================================
   SUBJECT IDS (by name, so IDs can differ per DB)
   ========================================================= */

SET @maths_id   = (SELECT id FROM subjects WHERE name = 'Maths');
SET @cs_id      = (SELECT id FROM subjects WHERE name = 'Computer Science');
SET @physics_id = (SELECT id FROM subjects WHERE name = 'Physics');


/* =========================================================
   QUESTIONS + OPTIONS
   6 questions, all different types & difficulties
   ========================================================= */

-- Q1: Maths, Single Choice, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'SCQ', 'What is 2 + 2?', 'easy');
SET @q1_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@q1_id, 0, '3', 0),
  (@q1_id, 1, '4', 1),
  (@q1_id, 2, '5', 0),
  (@q1_id, 3, '22', 0);


-- Q2: Computer Science, Multiple Choice, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'MCQ', 'Which of the following are programming languages?', 'medium');
SET @q2_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@q2_id, 0, 'Python', 1),
  (@q2_id, 1, 'HTML', 0),
  (@q2_id, 2, 'Java', 1),
  (@q2_id, 3, 'CSS', 0);


-- Q3: Physics, True/False, hard
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'TF',
        'The speed of light in vacuum is approximately 3×10^8 m/s.',
        'hard');
SET @q3_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@q3_id, 0, 'True', 1),
  (@q3_id, 1, 'False', 0);


-- Q4: Computer Science, Short Answer, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'SA',
        'Fill in the blank: The keyword used to define a function in Python is ___.',
        'easy');
SET @q4_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@q4_id, 0, 'def', 1);


-- Q5: Maths, Long Answer, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'LA',
        'Explain the Pythagorean theorem and give an example.',
        'medium');
SET @q5_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@q5_id, 0,
   'The Pythagorean theorem states that in a right-angled triangle the square '
   'of the hypotenuse equals the sum of the squares of the other two sides '
   '(a² + b² = c²). Example: for a=3, b=4, c=5.',
   1);


-- Q6: Physics, Single Choice, hard
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'SCQ',
        'Which law explains why a moving object continues in a straight line unless acted on by a force?',
        'hard');
SET @q6_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@q6_id, 0, 'Newton''s first law of motion', 1),
  (@q6_id, 1, 'Newton''s second law of motion', 0),
  (@q6_id, 2, 'Kepler''s first law', 0),
  (@q6_id, 3, 'Ohm''s law', 0);



/* =========================================================
   EXAMS
   3 manual exams, each in one subject
   ========================================================= */

-- Exam 1: Maths, uses Q1 (SCQ) + Q5 (LA)
INSERT INTO exams (subject_id, name, mode, base_difficulty, question_count)
VALUES (@maths_id, 'Maths Basics & Theorem', 'manual', 'easy', 2);
SET @e1_id = LAST_INSERT_ID();

-- Exam 2: Computer Science, uses Q2 (MCQ) + Q4 (SA)
INSERT INTO exams (subject_id, name, mode, base_difficulty, question_count)
VALUES (@cs_id, 'CS Fundamentals', 'manual', 'medium', 2);
SET @e2_id = LAST_INSERT_ID();

-- Exam 3: Physics, uses Q3 (TF) + Q6 (SCQ)
INSERT INTO exams (subject_id, name, mode, base_difficulty, question_count)
VALUES (@physics_id, 'Physics Concepts & Laws', 'manual', 'hard', 2);
SET @e3_id = LAST_INSERT_ID();



/* =========================================================
   EXAM_QUESTIONS mappings
   ========================================================= */

-- Exam 1: Maths Basics & Theorem
INSERT INTO exam_questions (exam_id, question_id, position) VALUES
  (@e1_id, @q1_id, 1),
  (@e1_id, @q5_id, 2);

-- Exam 2: CS Fundamentals
INSERT INTO exam_questions (exam_id, question_id, position) VALUES
  (@e2_id, @q2_id, 1),
  (@e2_id, @q4_id, 2);

-- Exam 3: Physics Concepts & Laws
INSERT INTO exam_questions (exam_id, question_id, position) VALUES
  (@e3_id, @q3_id, 1),
  (@e3_id, @q6_id, 2);