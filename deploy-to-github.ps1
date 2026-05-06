# Скрипт для деплоя на GitHub
Write-Host "=== Деплой admin.html на GitHub ===" -ForegroundColor Green

# Проверка Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git не установлен!" -ForegroundColor Red
    Write-Host "Скачайте и установите Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "После установки перезапустите PowerShell и запустите этот скрипт снова" -ForegroundColor Yellow
    pause
    exit
}

# Переход в папку backend
Set-Location "satory-tea\backend"

# Проверка, есть ли .git
if (-not (Test-Path ".git")) {
    Write-Host "Инициализация Git репозитория..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/fedagelesh90029-design/satory-backend.git
    git fetch origin
    git checkout -b main
    git branch --set-upstream-to=origin/main main
    git pull origin main --allow-unrelated-histories
}

# Добавление изменений
Write-Host "Добавление изменений..." -ForegroundColor Yellow
git add public/admin.html

# Коммит
Write-Host "Создание коммита..." -ForegroundColor Yellow
git commit -m "Fix cashier QR scanning with detailed logging"

# Пуш
Write-Host "Отправка на GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "=== Готово! ===" -ForegroundColor Green
Write-Host "Railway автоматически задеплоит изменения через 1-2 минуты" -ForegroundColor Cyan
Write-Host "Проверьте: https://satory-backend-production.up.railway.app/admin.html" -ForegroundColor Cyan
pause
