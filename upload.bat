@echo off
echo Starting deployment process...

node Script/optimize-image.js && ^
git add . && ^
git commit -m "adding new products" && ^
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed at a specific step. Remaining commands were cancelled.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] All tasks completed successfully.
pause