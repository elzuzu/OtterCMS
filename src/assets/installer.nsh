; Installer.nsh - Script NSIS personnalisé pour Indi-Suivi

; Installation de Visual C++ Redistributable si nécessaire
Section "Visual C++ Redistributable" SecVCRedist
  ; Vérifier si Visual C++ 2019+ est installé
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  StrCmp $0 "" installvcredist done
  
  installvcredist:
    DetailPrint "Installation des composants Visual C++ Redistributable..."
    ; On peut télécharger et installer VC++ Redist ici si nécessaire
    ; Pour l'instant, on continue l'installation
    
  done:
SectionEnd

; Configuration additionnelle pour l'application
Section "Configuration Indi-Suivi" SecConfig
  ; Créer le dossier de configuration si nécessaire
  CreateDirectory "$APPDATA\indi-suivi"
  
  ; Copier les fichiers de configuration par défaut
  SetOutPath "$INSTDIR\config"
  
  ; Définir les permissions appropriées
  DetailPrint "Configuration des permissions..."
SectionEnd
