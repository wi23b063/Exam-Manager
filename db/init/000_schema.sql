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


