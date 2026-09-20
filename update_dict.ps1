$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Iniciando criacao do super-dicionario..."
$hash = @{}

# Garantir palavras comuns que corretores as vezes pulam (contracoes, pronomes, nomes)
$mustHaves = "dela,dele,nela,nele,pra,pro,num,numa,dum,duma,daquilo,disso,disto,malte,gata,gato,amor,camila,teu,tua,meu,minha,sua,seu,nosso,nossa,deles,delas,neles,nelas,nestes,nestas,desses,dessas,daquele,daquela,daqueles,daquelas,aquele,aquela,aqueles,aquelas,isso,isto,aquilo,onde,aonde,donde,quando,como,porque,qual,quais,quem,cujo,cuja,tudo,nada,algo,alguem,ninguem,outrem,cada,varios,varias,tanto,tanta,quanto,quanta,qualquer,quaisquer,algum,alguma,alguns,algumas,nenhum,nenhuma,outro,outra,outros,outras,muito,muita,muitos,muitas,pouco,pouca,poucos,poucas,todo,toda,todos,todas,mesmo,mesma,mesmos,mesmas,proprio,propria,proprios,proprias,fui,foi,fomos,foram,vou,vai,vamos,vao,sou,es,somos,sao,estou,estas,esta,estamos,estao,tive,teve,tinha,terei,terao,houve,haver,seja,sejas,sejamos,sejam,faz,faco,fazem,fiz,fez,fizemos,fizeram,malte,cevada,lupulo,cerveja,chopp,bar,mesa,cadeira,linda,maravilhosa,perfeita" -split ","

foreach ($w in $mustHaves) {
    $clean = -join ($w.Normalize([System.Text.NormalizationForm]::FormD).ToCharArray() | Where-Object { [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark })
    $hash[$clean.ToUpper()] = $true
}

# Usaremos DUAS das maiores fontes de palavras em PT-BR para garantir verbos conjugados
$urls = @(
    "https://raw.githubusercontent.com/fserb/pt-br/master/palavras",
    "https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt"
)

foreach ($url in $urls) {
    Write-Host "Baixando base de dados: $url"
    $content = (Invoke-WebRequest -Uri $url -UseBasicParsing).Content
    $words = $content -split "`n"
    
    foreach ($w in $words) {
        $w = $w.Trim()
        if ($w.Length -ge 3 -and $w.Length -le 8 -and $w -match "^[\p{L}]+$") {
            $normalized = $w.Normalize([System.Text.NormalizationForm]::FormD)
            $clean = -join ($normalized.ToCharArray() | Where-Object { [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark })
            $upper = $clean.ToUpper()
            $hash[$upper] = $true
        }
    }
}

$finalWords = $hash.Keys | ForEach-Object { "`"$_`"" }
$jsContent = "const dictionary = [" + ($finalWords -join ",") + "];"
[System.IO.File]::WriteAllText("C:\Users\karla.vizone\Desktop\wordmila\dictionary.js", $jsContent, [System.Text.Encoding]::UTF8)

Write-Host "Super Dicionario gerado com $($hash.Count) palavras validas!"
