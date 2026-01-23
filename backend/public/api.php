<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../db.php';
require __DIR__ . '/../Router.php';

require __DIR__ . '/../controllers/AuthController.php';
require __DIR__ . '/../controllers/SubjectController.php';
require __DIR__ . '/../controllers/QuestionController.php';
require __DIR__ . '/../controllers/ExamController.php'; 
require __DIR__ . '/../controllers/UserController.php'; 

$router = new Router($pdo);
$router->dispatch();
