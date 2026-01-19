@echo off
echo Starting deployment process...

REM node Scripts\optimize_images.js && ^
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