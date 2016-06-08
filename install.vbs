dim xHttp: Set xHttp = createobject("Microsoft.XMLHTTP")
dim bStrm: Set bStrm = createobject("Adodb.Stream")

dim strGitInstallFileURL:     Set strGitInstallFileURL =     "https://github.com/git-for-windows/git/releases/download/v2.8.4.windows.1/Git-2.8.4-32-bit.exe"
dim strGitInstallHDLocation:  Set strGitInstallHDLocation =  "Git-2.8.4-32-bit.exe"
dim strNodeInstallFileURL:    Set strNodeInstallFileURL =    "https://nodejs.org/dist/v6.2.1/node-v6.2.1-x86.msi"
dim strNodeInstallHDLocation: Set strNodeInstallHDLocation = "node-v6.2.1-x86.msi"

xHttp.Open "GET", strGitInstallFileURL, False
xHttp.Send
with bStrm
    .type = 1 '//binary
    .open
    .write xHttp.responseBody
    .savetofile strGitInstallHDLocation, 2 '//overwrite
    .close
end with

xHttp.Open "GET", strNodeInstallFileURL, False
xHttp.Send
with bStrm
    .type = 1 '//binary
    .open
    .write xHttp.responseBody
    .savetofile strNodeInstallHDLocation, 2 '//overwrite
    .close
end with

Set xHttp = Nothing
Set bStrm = Nothing


Const MSIFileName = "\\<IP ADDR>\c$\MySetup\<FILENAME>"

Set WshShell = WScript.CreateObject( "WScript.Shell" )
WshShell.Run "msiexec /a " & strNodeInstallHDLocation & " /quiet /log c:\install.log", 1, True
WshShell.Run "strGitInstallHDLocation", 1, True


WshShell.Run "npm install", 1, True
