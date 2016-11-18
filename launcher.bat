cd %~dp0
@ECHO Enjoy ScreenWerk
(git pull && node_modules\electron-prebuilt\dist\electron app/main.js) || node_modules\electron-prebuilt\dist\electron app/main.js
@ECHO Exited ScreenWerk
