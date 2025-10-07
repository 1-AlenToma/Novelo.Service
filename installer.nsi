;--------------------------------
; Novelo Service Installer
;--------------------------------

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "nsExec.nsh"
!include "LogicLib.nsh"

Name "Novelo Service"
OutFile "NoveloServiceInstaller.exe"
InstallDir "$PROGRAMFILES\NoveloService"
RequestExecutionLevel admin

Var StartMenuFolder

;--------------------------------
; Interface
;--------------------------------

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

;--------------------------------
; Install Section
;--------------------------------

Section "Install Novelo Service"

  SetOutPath "$INSTDIR"
  File /r "D:\Projects\Novelo.Service\*.*"

  DetailPrint "Checking Node.js installation..."
  nsExec::ExecToStack 'cmd /C node -v >nul 2>&1'
  Pop $0
  Pop $1

  ${If} $0 != 0
    DetailPrint "Node.js not found. Installing Node.js LTS..."
    ; Download Node.js MSI installer
    inetc::get /silent /popup "" "https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi" "$TEMP\node-installer.msi"
    Pop $0
    ${If} $0 == "OK"
      DetailPrint "Running Node.js installer..."
      ExecWait 'msiexec /i "$TEMP\node-installer.msi" /quiet /norestart' $1
      Delete "$TEMP\node-installer.msi"
      DetailPrint "Node.js installed successfully."
    ${Else}
      MessageBox MB_ICONSTOP "Failed to download Node.js installer. Please check your internet connection."
      Abort
    ${EndIf}
  ${Else}
    DetailPrint "Node.js already installed."
  ${EndIf}

  ; Run npm install
  DetailPrint "Installing npm dependencies..."
  nsExec::ExecToLog 'cmd /C "cd /d $INSTDIR && npm install --omit=dev"'

  ; Register Windows service
  DetailPrint "Registering Windows service..."
  nsExec::ExecToLog 'cmd /C "cd /d $INSTDIR && node service.js"'

  ; Optional: Create desktop shortcut
  CreateShortCut "$DESKTOP\Novelo Service.lnk" "$INSTDIR\index.html"

  DetailPrint "Installation complete!"

SectionEnd

;--------------------------------
; Uninstall Section
;--------------------------------

Section "Uninstall Novelo Service"

  DetailPrint "Stopping and removing Novelo Service..."
  nsExec::ExecToLog 'cmd /C "sc stop NoveloService >nul 2>&1"'
  nsExec::ExecToLog 'cmd /C "sc delete NoveloService >nul 2>&1"'

  Delete "$DESKTOP\Novelo Service.lnk"
  RMDir /r "$INSTDIR"

  DetailPrint "Uninstallation complete."

SectionEnd
