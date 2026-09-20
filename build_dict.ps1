$ErrorActionPreference = 'Stop'
Write-Host "Baixando banco de palavras em portugues..."
$url = "https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt"
$content = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
$words = $content -split "`n"

Write-Host "Limpando acentos e filtrando..."
$hash = @{}
foreach ($w in $words) {
    $w = $w.Trim()
    # Pega palavras de 3 a 8 letras que tenham apenas caracteres alfabéticos
    if ($w.Length -ge 3 -and $w.Length -le 8 -and $w -match "^[\p{L}]+$") {
        # Normaliza removendo acentos
        $normalized = $w.Normalize([System.Text.NormalizationForm]::FormD)
        $clean = -join ($normalized.ToCharArray() | Where-Object { [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark })
        $upper = $clean.ToUpper()
        $hash[$upper] = $true
    }
}

# Garante a presenca dos Easter Eggs
$hash["GATINHO"] = $true
$hash["FELINO"] = $true
$hash["RONRONAR"] = $true

$finalWords = $hash.Keys | ForEach-Object { "`"$_`"" }
$jsContent = "const dictionary = [" + ($finalWords -join ",") + "];"
[System.IO.File]::WriteAllText("C:\Users\karla.vizone\Desktop\wordmila\dictionary.js", $jsContent, [System.Text.Encoding]::UTF8)

Write-Host "Dicionario concluido com $($hash.Count) palavras validas!"
