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
#   powershell -ExecutionPolicy Bypass -File tools\spend.ps1 -NeedToday 60   # exit 3 if not affordable

param(
  [double]$CampaignCap = 2000,
  [double]$SubscriptionCap = 5000,
  [double]$Margin = 0.9,
  [double]$NeedToday = 50
)

$ErrorActionPreference = 'Stop'
$sub = (az account show --query id -o tsv).Trim()
$rid = "/subscriptions/$sub/resourceGroups/rg-contosohub/providers/Microsoft.CognitiveServices/accounts/ai-contosohub530569751908"
$url = "https://management.azure.com/subscriptions/$sub/providers/Microsoft.CostManagement/query?api-version=2023-03-01"
$tmp = Join-Path $env:TEMP "itihasa-cost-body.json"
$errf = Join-Path $env:TEMP "itihasa-cost-err.txt"

function Query($body) {
  # The body goes through a file: the Cost Management filter is JSON full of quotes and braces,
  # and passing it inline through az's .cmd shim is how an argument gets re-parsed by cmd.exe.
  $body | Set-Content $tmp -Encoding ascii
  # Cost Management throttles hard, and the tenant is shared: on 29 Sep the first query of the
  # day came back 429. az exits non-zero with nothing on stdout, and the old version parsed that
  # nothing and failed three lines later on a null array, which reads like a bug in this script
  # rather than a busy API. So: retry 429 with a growing wait, and fail with the real message.
  for ($try = 1; $try -le 6; $try++) {
    # Windows PowerShell 5.1 turns a native command's redirected stderr into a terminating error
    # under 'Stop', so the preference is relaxed for exactly this call.
    $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    $raw = az rest --method post --url $url --body "@$tmp" -o json 2> $errf
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -eq 0) { return ($raw | Out-String | ConvertFrom-Json).properties }
    $err = (Get-Content $errf -Raw -ErrorAction SilentlyContinue) -as [string]
    if ($err -notmatch '429|Too Many Requests') { throw "Cost Management query failed: $($err.Trim())" }
    $wait = 20 * $try
    Write-Host ("  Cost Management is throttling (429); retry {0}/6 in {1}s" -f $try, $wait)
    Start-Sleep -Seconds $wait
  }
  throw 'Cost Management was still throttling after 6 attempts; run again later'
}

$all = Query '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"Daily","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}},"grouping":[{"type":"Dimension","name":"ResourceId"}]}}'
$acols = $all.columns.name
$aci = [array]::IndexOf($acols, 'Cost'); $adi = [array]::IndexOf($acols, 'UsageDate'); $ari = [array]::IndexOf($acols, 'ResourceId')
$subDay = @{}
$total = 0.0
foreach ($r in $all.rows) {
  $d = [string]$r[$adi]; $c = [double]$r[$aci]
  $total += $c
  if (-not $subDay.ContainsKey($d)) { $subDay[$d] = @{ all = 0.0; shared = 0.0 } }
  $subDay[$d].all += $c
  if ([string]$r[$ari] -match 'ai-contosohub530569751908') { $subDay[$d].shared += $c }
}
"subscription month-to-date: {0:N2} USD" -f $total

# A pause between the two queries, so the second does not land in the same throttling window.
Start-Sleep -Seconds 5

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

# ── the two limits, stated by the user on 29 Sep ─────────────────────────────────────────────
# This campaign has $2,000 a month; the subscription as a whole is capped at $5,000. Other
# projects share the subscription and their rate is not ours to set -- in September it went from
# about $45 a day to about $100 a day in the last week -- so the subscription side is projected
# from their recent rate, with a margin, because this data runs about a day behind.
$today = (Get-Date).ToUniversalTime()
$daysInMonth = [DateTime]::DaysInMonth($today.Year, $today.Month)
$left = $daysInMonth - $today.Day + 1
$complete = $subDay.Keys | Sort-Object | Where-Object { $_ -lt $today.ToString('yyyyMMdd') } | Select-Object -Last 7
$otherRate = 0.0
if ($complete) {
  $otherRate = ($complete | ForEach-Object {
    $v = $subDay[$_]; $v.all - $(if ($wrote.ContainsKey($_)) { $v.shared } else { 0 })
  } | Measure-Object -Average).Average
}
$projected = $total + $left * $otherRate
$campaignLeft = $CampaignCap - $mine
$subscriptionLeft = ($SubscriptionCap * $Margin) - $projected
$allowance = [Math]::Min($campaignLeft, $subscriptionLeft)
""
"limits:"
"  campaign        {0,8:N2} of {1:N0} spent            -> {2,8:N2} left" -f $mine, $CampaignCap, $campaignLeft
"  subscription    {0,8:N2} so far; other projects at {1:N2}/day over the last {2} complete days" -f $total, $otherRate, @($complete).Count
"                  projected month-end {0:N2} + this campaign  vs {1:N0} x {2} = {3:N0}  -> {4,8:N2} left" -f $projected, $SubscriptionCap, $Margin, ($SubscriptionCap * $Margin), $subscriptionLeft
"  allowance for the rest of the month: {0:N2} USD  ({1} day(s) left, {2:N2}/day)" -f $allowance, $left, ($allowance / [Math]::Max(1, $left))
if ($allowance -ge $NeedToday) {
  "GO: {0:N2} available, {1:N2} needed for today's work" -f $allowance, $NeedToday
  Remove-Item $tmp, $errf -ErrorAction SilentlyContinue
  exit 0
}
"STOP: {0:N2} available, {1:N2} needed -- do not generate" -f $allowance, $NeedToday
Remove-Item $tmp, $errf -ErrorAction SilentlyContinue
exit 3
