CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Beispiel-Startwerte
INSERT IGNORE INTO subjects(name) VALUES ('Mathematik'), ('Informatik'), ('Physik');


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



