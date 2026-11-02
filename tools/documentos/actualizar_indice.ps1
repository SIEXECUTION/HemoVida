param([switch]$ExportarRevision)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$documentPath = Join-Path $projectRoot 'output\documentos\HEMOVIDA_COMPLETO_CON_135_DIAGRAMAS.docx'
if (-not (Test-Path -LiteralPath $documentPath)) { throw 'Primero genera el documento con completar_con_diagramas.py.' }
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null
try {
    $document = $word.Documents.Open($documentPath, $false, $false)
    $null = $document.Fields.Update()
    foreach ($toc in $document.TablesOfContents) { $toc.Update() }
    $document.Repaginate()
    $document.Save()
    if ($ExportarRevision) {
        $reviewDirectory = Join-Path $projectRoot '.venv\documento_cierre'
        $null = New-Item -ItemType Directory -Path $reviewDirectory -Force
        $document.ExportAsFixedFormat((Join-Path $reviewDirectory 'revision_135.pdf'), 17)
    }
    Write-Output ('Paginas: ' + $document.ComputeStatistics(2) + '; indices: ' + $document.TablesOfContents.Count + '; imagenes: ' + $document.InlineShapes.Count)
} finally {
    if ($null -ne $document) { $document.Close(0) }
    $word.Quit()
}
