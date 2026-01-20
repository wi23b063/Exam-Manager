CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Beispiel-Startwerte
INSERT IGNORE INTO subjects(name) VALUES ('Maths'), ('Computer Science'), ('Physics');

-- user table + admin user
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$WAULII86DMP0k4LZzYjC1.3jkpTcHlhb7QEYtRy4t5QSvYBu/nxzC',
  'admin'
);



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
        'Fill in the blank: The keyword used to define a function in Python is _.',
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
   ADDITIONAL QUESTIONS (5 per subject)
   ========================================================= */

-- =========================
-- MATHS (5)
-- =========================

-- M1: Maths, TF, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'TF', 'A prime number has exactly two positive divisors: 1 and itself.', 'easy');
SET @m1_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@m1_id, 0, 'True', 1),
  (@m1_id, 1, 'False', 0);

-- M2: Maths, SCQ, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'SCQ', 'What is the value of 7 × 6?', 'easy');
SET @m2_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@m2_id, 0, '36', 0),
  (@m2_id, 1, '42', 1),
  (@m2_id, 2, '46', 0),
  (@m2_id, 3, '48', 0);

-- M3: Maths, MCQ, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'MCQ', 'Which of the following numbers are multiples of 3?', 'medium');
SET @m3_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@m3_id, 0, '12', 1),
  (@m3_id, 1, '14', 0),
  (@m3_id, 2, '21', 1),
  (@m3_id, 3, '25', 0);

-- M4: Maths, SA, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'SA', 'Solve for x: 3x + 5 = 20. What is x?', 'medium');
SET @m4_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@m4_id, 0, '5', 1);

-- M5: Maths, LA, hard
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@maths_id, 'LA', 'Explain what a derivative represents in calculus and compute the derivative of f(x)=x^2.', 'hard');
SET @m5_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@m5_id, 0,
   'A derivative represents the instantaneous rate of change (slope of the tangent line) of a function. '
   'For f(x)=x^2, f''(x)=2x.',
   1);


-- =========================
-- COMPUTER SCIENCE (5)
-- =========================

-- CS1: CS, TF, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'TF', 'In most programming languages, an array/list index typically starts at 0.', 'easy');
SET @cs1_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@cs1_id, 0, 'True', 1),
  (@cs1_id, 1, 'False', 0);

-- CS2: CS, SCQ, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'SCQ', 'Which data structure works on a First-In, First-Out (FIFO) principle?', 'easy');
SET @cs2_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@cs2_id, 0, 'Stack', 0),
  (@cs2_id, 1, 'Queue', 1),
  (@cs2_id, 2, 'Tree', 0),
  (@cs2_id, 3, 'Graph', 0);

-- CS3: CS, MCQ, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'MCQ', 'Which of the following are valid HTTP methods?', 'medium');
SET @cs3_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@cs3_id, 0, 'GET', 1),
  (@cs3_id, 1, 'POST', 1),
  (@cs3_id, 2, 'FETCH', 0),
  (@cs3_id, 3, 'DELETE', 1);

-- CS4: CS, SA, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'SA', 'What is the time complexity (Big-O) of binary search on a sorted array?', 'medium');
SET @cs4_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@cs4_id, 0, 'O(log n)', 1);

-- CS5: CS, LA, hard
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@cs_id, 'LA', 'Explain the difference between a process and a thread, and give one advantage of multithreading.', 'hard');
SET @cs5_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@cs5_id, 0,
   'A process is an independent program instance with its own address space, while threads are lightweight execution units within a process that share memory. '
   'An advantage of multithreading is improved responsiveness or better CPU utilization for parallelizable tasks.',
   1);


-- =========================
-- PHYSICS (5)
-- =========================

-- P1: Physics, TF, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'TF', 'Energy cannot be created or destroyed, only transformed from one form to another.', 'easy');
SET @p1_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@p1_id, 0, 'True', 1),
  (@p1_id, 1, 'False', 0);

-- P2: Physics, SCQ, easy
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'SCQ', 'What is the SI unit of force?', 'easy');
SET @p2_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@p2_id, 0, 'Joule (J)', 0),
  (@p2_id, 1, 'Watt (W)', 0),
  (@p2_id, 2, 'Newton (N)', 1),
  (@p2_id, 3, 'Pascal (Pa)', 0);

-- P3: Physics, MCQ, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'MCQ', 'Which of the following are scalar quantities?', 'medium');
SET @p3_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@p3_id, 0, 'Speed', 1),
  (@p3_id, 1, 'Velocity', 0),
  (@p3_id, 2, 'Temperature', 1),
  (@p3_id, 3, 'Force', 0);

-- P4: Physics, SA, medium
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'SA', 'A car travels 150 km in 3 hours. What is its average speed in km/h?', 'medium');
SET @p4_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@p4_id, 0, '50', 1);

-- P5: Physics, LA, hard
INSERT INTO questions (subject_id, type, text, difficulty)
VALUES (@physics_id, 'LA', 'State Ohm''s law and calculate the current through a 10 Ω resistor when 5 V is applied.', 'hard');
SET @p5_id = LAST_INSERT_ID();

INSERT INTO options (question_id, idx, text, is_correct) VALUES
  (@p5_id, 0,
   'Ohm''s law states V = I·R. With V=5 V and R=10 Ω, I = V/R = 5/10 = 0.5 A.',
   1);

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