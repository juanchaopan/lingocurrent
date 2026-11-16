$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$fixture = Get-Content -LiteralPath (Join-Path $PSScriptRoot '../fixtures/reading.json') -Raw | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $synth.SetOutputToWaveFile([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../fixtures/reading.wav')))
  $synth.Speak($fixture.body)
} finally {
  $synth.Dispose()
}
