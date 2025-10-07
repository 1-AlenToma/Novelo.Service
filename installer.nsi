;--------------------------------
; Novelo Service Installer
;--------------------------------

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
;!include "nsExec.nsh"

Name "Novelo Service"
OutFile "NoveloServiceInstaller.exe"
InstallDir "$PROGRAMFILES\NoveloService"
RequestExecutionLevel admin

Var StartMenuFolder
Var UninstallerPath


;--------------------------------
; MUI Pages
;--------------------------------
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_STARTMENU Application $StartMenuFolder
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_LANGUAGE "English"

;--------------------------------
; Install Section
;--------------------------------

Section "Install Novelo Service"

  SetOutPath "$INSTDIR"
  File /r "D:\Projects\Novelo.Service\src\*"
  StrCpy $UninstallerPath "$INSTDIR\Uninstall.exe"

  DetailPrint "Checking Node.js installation..."
  nsExec::ExecToStack 'cmd /C node -v >nul 2>&1'
  Pop $0
  Pop $1

  ${If} $0 != 0
    DetailPrint "Node.js not found. Installing Node.js LTS..."
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

  DetailPrint "Installing npm dependencies..."
  nsExec::ExecToLog 'cmd /C "cd /d $INSTDIR && npm install --omit=dev"'

  DetailPrint "Registering Windows service..."
  nsExec::ExecToLog 'cmd /C "cd /d $INSTDIR && node service.js"'

  ; --- Start Menu Shortcut ---
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortCut "$SMPROGRAMS\$StartMenuFolder\Novelo Service.lnk" "$INSTDIR\browse.bat" "" "$INSTDIR\assets\icon.ico" 0
  !insertmacro MUI_STARTMENU_WRITE_END

  ; --- Desktop Shortcut ---
  CreateShortCut "$DESKTOP\Novelo Service.lnk" "$INSTDIR\browse.bat" "" "$INSTDIR\assets\icon.ico" 0
  ; Create uninstaller
  WriteUninstaller "$UninstallerPath"
  
  ; Register uninstaller in Add/Remove Programs
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Novelo Service" "DisplayName" "Novelo Service"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Novelo Service" "UninstallString" "$UninstallerPath"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Novelo Service" "InstallLocation" "$INSTDIR"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Novelo Service" "DisplayIcon" "$INSTDIR\assets\icon.ico"

  DetailPrint "Installation complete!"

SectionEnd

;--------------------------------
; Uninstall Section
;--------------------------------
# uninstaller section start
Section "uninstall"

  DetailPrint "Stopping and removing Novelo Service..."
  ; Stop service if exists
  nsExec::ExecToLog 'cmd /C "sc stop NoveloService >nul 2>&1"'
  ; Delete service
   nsExec::ExecToLog 'cmd /C "cd /d $INSTDIR && node uninstall.js"'
  ;nsExec::ExecToLog 'cmd /C "sc delete NoveloService >nul 2>&1"'

  ; Remove Desktop shortcut
  Delete "$DESKTOP\Novelo Service.lnk"

  ; Remove Start Menu folder & shortcut
  RMDir /r "$SMPROGRAMS\Novelo Service"

  ; Remove installed files
  RMDir /r "$INSTDIR"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Novelo Service"

  DetailPrint "Uninstallation complete."

SectionEnd
