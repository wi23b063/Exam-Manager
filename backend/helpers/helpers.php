<?php

function requireLogin(): void
{
    if (!isset($_SESSION['user'])) {
        jsonOut(['ok' => false, 'error' => 'unauthorized'], 401);
    }
}

function currentRole(): string
{
    return (string)($_SESSION['user']['role'] ?? '');
}

function requireRole(array $roles): void
{
    requireLogin();
    $role = currentRole();
    if (!in_array($role, $roles, true)) {
        jsonOut(['ok' => false, 'error' => 'forbidden'], 403);
    }
}

function requireAdmin(): void
{
    requireRole(['admin']);
}

function requireEditorOrAdmin(): void
{
    requireRole(['admin', 'editor']);
}