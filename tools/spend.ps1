# What this month has actually cost, from Azure Cost Management rather than an estimate.
#
# The estimate this replaced was twice too high per Short (about $12 against a measured $5.90)
# and missed about $650 of usage entirely, because the Azure AI resource the pipeline uses is
# shared with other projects. So this reports three things separately:
#
#   the subscription's month-to-date total   what any subscription-level ceiling sees
#   the shared resource, by day and meter    where image and Sora spend actually went
#   days on which this repo wrote output     so a day's spend can be attributed or ruled out
#
# Cost data lags by about a day, so today's work does not appear until tomorrow.
#
#   powershell -ExecutionPolicy Bypass -File tools\spend.ps1

$ErrorActionPreference = 'Stop'
$sub = (az account show --query id -o tsv).Trim()
$rid = "/subscriptions/$sub/resourceGroups/rg-contosohub/providers/Microsoft.CognitiveServices/accounts/ai-contosohub530569751908"
$url = "https://management.azure.com/subscriptions/$sub/providers/Microsoft.CostManagement/query?api-version=2023-03-01"
$tmp = Join-Path $env:TEMP "itihasa-cost-body.json"

function Query($body) {
  # The body goes through a file: the Cost Management filter is JSON full of quotes and braces,
  # and passing it inline through az's .cmd shim is how an argument gets re-parsed by cmd.exe.
  $body | Set-Content $tmp -Encoding ascii
  $raw = az rest --method post --url $url --body "@$tmp" -o json
  return ($raw | Out-String | ConvertFrom-Json).properties
}

$all = Query '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}'
$total = ($all.rows | ForEach-Object { $_[0] } | Measure-Object -Sum).Sum
"subscription month-to-date: {0:N2} USD" -f $total

$daily = Query ('{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"Daily","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}},"grouping":[{"type":"Dimension","name":"Meter"}],"filter":{"dimensions":{"name":"ResourceId","operator":"In","values":["' + $rid + '"]}}}}')
$cols = $daily.columns.name
$ci = [array]::IndexOf($cols, 'Cost'); $mi = [array]::IndexOf($cols, 'Meter'); $di = [array]::IndexOf($cols, 'UsageDate')

$days = @{}
foreach ($r in $daily.rows) {
  $d = [string]$r[$di]; $m = [string]$r[$mi]
  $k = if ($m -match 'Image 2') { 'image' } elseif ($m -match 'Sora') { 'sora' } elseif ($m -match 'Speech') { 'tts' } else { 'other' }
  if (-not $days.ContainsKey($d)) { $days[$d] = @{ image = 0.0; sora = 0.0; tts = 0.0; other = 0.0 } }
  $days[$d][$k] += [double]$r[$ci]
}

# A day counts as this campaign's only if the repo wrote generated output on it. Stills and
# clips land under episodes\ and eras\; nothing else here calls the image or video models.
$root = Split-Path $PSScriptRoot -Parent
$wrote = @{}
Get-ChildItem (Join-Path $root 'episodes'), (Join-Path $root 'eras') -Recurse -Include *.png, *.mp4 -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date -Day 1).Date } |
  ForEach-Object { $wrote[$_.LastWriteTime.ToUniversalTime().ToString('yyyyMMdd')] = $true }

""
"shared resource ai-contosohub530569751908, by day (USD):"
"  day          image     sora      tts    other    total   this repo wrote output?"
$res = 0.0; $mine = 0.0
foreach ($d in ($days.Keys | Sort-Object)) {
  $v = $days[$d]; $t = $v.image + $v.sora + $v.tts + $v.other
  $res += $t
  if ($t -lt 0.5) { continue }
  $w = $wrote.ContainsKey($d)
  if ($w) { $mine += $t }
  "  {0}-{1}-{2} {3,8:N2} {4,8:N2} {5,8:N2} {6,8:N2} {7,8:N2}   {8}" -f $d.Substring(0,4), $d.Substring(4,2), $d.Substring(6,2), $v.image, $v.sora, $v.tts, $v.other, $t, $(if ($w) { 'yes' } else { 'no - another project' })
}
""
"  resource total:            {0,8:N2}" -f $res
"  on days this repo worked:  {0,8:N2}   (an upper bound: other projects may share those days)" -f $mine
"  on days it did not:        {0,8:N2}" -f ($res - $mine)
Remove-Item $tmp -ErrorAction SilentlyContinue
