#define BouVersion "1.9.0"

[Setup]
AppId={{9A40D78A-93E6-4677-A26F-89F98495A55A}
AppName=Bou AI Assistant
AppVersion={#BouVersion}
AppPublisher=Bou
DefaultDirName={localappdata}\Programs\Bou AI Assistant
DefaultGroupName=Bou AI Assistant
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
OutputDir=output
OutputBaseFilename=Bou-AI-Assistant-Setup-x64-v{#BouVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
Uninstallable=yes
DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "..\dist\BouAssistant\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Bou AI Assistant"; Filename: "{app}\BouAssistant.exe"
Name: "{autodesktop}\Bou AI Assistant"; Filename: "{app}\BouAssistant.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\BouAssistant.exe"; Description: "Launch Bou AI Assistant"; Flags: postinstall nowait skipifsilent
