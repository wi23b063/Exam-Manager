<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors','1');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit; // CORS preflight
function envs($k,$d=null){ $v=getenv($k); return $v===false?$d:$v; }
function jsonOut($data,int $status=200){
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE); exit;
}
function body(){ return json_decode(file_get_contents('php://input'), true) ?? []; }
