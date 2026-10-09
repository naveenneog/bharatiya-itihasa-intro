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

# The machine is shared, and another process's `az login` replaces the CLI's default account for
# everyone -- found 10 Oct, when a fresh sign-in (azureProfile.json rewritten, az config read
# "first_run: yes") swapped the subscription to one with no access to rg-contosohub. Cost
# Management did not error: it quietly returned almost no rows (one day, $3.88, from an unrelated
# resource group), which read as a huge spend *drop* rather than a broken login. A resource group
# with $1,383+ tracked this month cannot really vanish between two runs, so this is checked first
# with a plain ARM call, which answers true/false regardless of what Cost Management has indexed
# and so cannot itself be fooled by sparse cost data.
$rgExists = (az group exists --name rg-contosohub -o tsv 2>$null).Trim()
if ($rgExists -ne 'true') {
  $who = (az account show --query "{name:name, user:user.name}" -o json 2>$null | ConvertFrom-Json)
  ""
  "BLOCKED: resource group 'rg-contosohub' is not visible from the current az login."
  ("  logged in as {0} on subscription `"{1}`" ({2})" -f $who.user, $who.name, $sub)
  "  this is almost certainly another az login on this shared machine replacing the CLI's"
  "  default account, not a real deletion or spend change -- do not trust any figure from this"
  "  run. Re-authenticate with the account that holds rg-contosohub (az login) and run again."
  exit 2
}

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

# Cost Management buckets usage by UTC day. The query covers the month so far *and* the nine days
# before today, whichever starts earlier: the other projects' rate is an average of their last
# seven complete days, and on the 1st of a month "MonthToDate" holds no complete days at all.
# Run that way on 1 Oct, the old version found no rate, projected the other projects' October at
# $0 against a September that ended near $115 a day, and would have allowed the whole campaign
# cap against a subscription that could not afford it.
$today = (Get-Date).ToUniversalTime().Date
$monthStart = $today.AddDays(1 - $today.Day)
$windowStart = if ($monthStart -lt $today.AddDays(-9)) { $monthStart } else { $today.AddDays(-9) }
$period = '"timeframe":"Custom","timePeriod":{"from":"' + $windowStart.ToString('yyyy-MM-dd') + 'T00:00:00Z","to":"' + $today.ToString('yyyy-MM-dd') + 'T23:59:59Z"}'
$ms = $monthStart.ToString('yyyyMMdd')

# The subscription by day, ungrouped: a handful of rows, so no page of results can be cut short.
$all = Query ('{"type":"ActualCost",' + $period + ',"dataset":{"granularity":"Daily","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}')
$acols = $all.columns.name
$aci = [array]::IndexOf($acols, 'Cost'); $adi = [array]::IndexOf($acols, 'UsageDate')
$subDay = @{}
$total = 0.0
foreach ($r in $all.rows) {
  $d = [string]$r[$adi]; $c = [double]$r[$aci]
  if (-not $subDay.ContainsKey($d)) { $subDay[$d] = @{ all = 0.0; shared = 0.0 } }
  $subDay[$d].all += $c
  if ($d -ge $ms) { $total += $c }
}
"subscription month-to-date ({0:yyyy-MM}): {1:N2} USD" -f $monthStart, $total

# A pause between queries, so the next does not land in the same throttling window.
Start-Sleep -Seconds 5

# The shared resource by day, ungrouped, over the same window: its share of each day.
#
# Three query shapes, kept apart. Cost Management has twice returned a recent day exactly doubled.
# On 3 Oct it read 1 Oct as $19.52 (every meter doubled) in the query filtered to this resource,
# grouped by meter, over a window crossing the month boundary, while four other shapes read $9.76.
# On 4 Oct it read 2 Oct doubled in all six shapes tried (subscription $610.31, this resource
# $381.06), and on 5 Oct the same six read $305.15 and $190.53. So the doubling is a transient
# state of the data, not a property of one query shape; each day's reading is compared with the
# last run's below, and an exact double or half is reported.
$shq = Query ('{"type":"ActualCost",' + $period + ',"dataset":{"granularity":"Daily","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}},"filter":{"dimensions":{"name":"ResourceId","operator":"In","values":["' + $rid + '"]}}}}')
$scols = $shq.columns.name
$sci = [array]::IndexOf($scols, 'Cost'); $sdi = [array]::IndexOf($scols, 'UsageDate')
foreach ($r in $shq.rows) {
  $d = [string]$r[$sdi]
  if (-not $subDay.ContainsKey($d)) { $subDay[$d] = @{ all = 0.0; shared = 0.0 } }
  $subDay[$d].shared += [double]$r[$sci]
}

Start-Sleep -Seconds 5

# The shared resource by meter, this month only, for the table below.
$monthPeriod = '"timeframe":"Custom","timePeriod":{"from":"' + $monthStart.ToString('yyyy-MM-dd') + 'T00:00:00Z","to":"' + $today.ToString('yyyy-MM-dd') + 'T23:59:59Z"}'
$daily = Query ('{"type":"ActualCost",' + $monthPeriod + ',"dataset":{"granularity":"Daily","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}},"grouping":[{"type":"Dimension","name":"Meter"}],"filter":{"dimensions":{"name":"ResourceId","operator":"In","values":["' + $rid + '"]}}}}')
$cols = $daily.columns.name
$ci = [array]::IndexOf($cols, 'Cost'); $mi = [array]::IndexOf($cols, 'Meter'); $di = [array]::IndexOf($cols, 'UsageDate')

$days = @{}
foreach ($r in $daily.rows) {
  $d = [string]$r[$di]; $m = [string]$r[$mi]; $c = [double]$r[$ci]
  $k = if ($m -match 'Image 2') { 'image' } elseif ($m -match 'Sora') { 'sora' } elseif ($m -match 'Speech') { 'tts' } else { 'other' }
  if (-not $days.ContainsKey($d)) { $days[$d] = @{ image = 0.0; sora = 0.0; tts = 0.0; other = 0.0 } }
  $days[$d][$k] += $c
}

# Which days this repo generated, and roughly how much. Stills and clips land under episodes\ and
# eras\; nothing else here calls the image or video models. A clip is 8 s of Sora at $0.10/s and a
# still about $0.20 (26 Sep: one Short, six clips and six stills, measured $5.87).
#
# The estimate matters because another project uses the same resource: on 2 Oct it spent $184 on
# Sora there. Attributing a whole shared day to this campaign is safe for the campaign's own cap,
# but subtracting it from the subscription's day would hide the other project's spend from the
# rate below. So the campaign cap uses the whole shared day (an upper bound) and the rate
# subtracts only the estimate.
$root = Split-Path $PSScriptRoot -Parent
$wrote = @{}; $est = @{}
Get-ChildItem (Join-Path $root 'episodes'), (Join-Path $root 'eras') -Recurse -Include *.png, *.mp4 -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTimeUtc -ge $windowStart } |
  ForEach-Object {
    $d = $_.LastWriteTimeUtc.ToString('yyyyMMdd')
    $wrote[$d] = $true
    $est[$d] = [double]$est[$d] + $(if ($_.Extension -eq '.mp4') { 0.80 } else { 0.20 })
  }
function Mine($d) { if (-not $wrote.ContainsKey($d)) { return 0.0 }; return [Math]::Min([double]$subDay[$d].shared, [double]$est[$d]) }

""
"shared resource ai-contosohub530569751908, by day this month (USD):"
"  day          image     sora      tts    other    total   this repo wrote output?"
$res = 0.0; $mine = 0.0; $mineEst = 0.0
foreach ($d in ($days.Keys | Sort-Object)) {
  $v = $days[$d]; $t = $v.image + $v.sora + $v.tts + $v.other
  $res += $t
  if ($t -lt 0.5) { continue }
  $w = $wrote.ContainsKey($d)
  if ($w) { $mine += $t; $mineEst += [Math]::Min($t, [double]$est[$d]) }
  "  {0}-{1}-{2} {3,8:N2} {4,8:N2} {5,8:N2} {6,8:N2} {7,8:N2}   {8}" -f $d.Substring(0,4), $d.Substring(4,2), $d.Substring(6,2), $v.image, $v.sora, $v.tts, $v.other, $t, $(if ($w) { 'yes, est. {0:N2}' -f [Math]::Min($t, [double]$est[$d]) } else { 'no - another project' })
}
""
"  resource total:            {0,8:N2}" -f $res
"  on days this repo worked:  {0,8:N2}   (an upper bound: other projects may share those days)" -f $mine
"  this repo, estimated:      {0,8:N2}   (from its own clips and stills)" -f $mineEst
"  on days it did not:        {0,8:N2}" -f ($res - $mine)

# ── readings that changed by exactly 2x or 1/2 since the last run ────────────────────────────
# A transiently doubled day (see the query shapes above) pushes the rate below towards STOP, which
# is the safe side, but it must not be reported as spend. Each run stores every day's subscription
# and shared-resource figures in dist\spend-readings.json; a figure of at least $5 that is now
# within 0.2% of twice, or half, the last run's reading of the same day is listed here. A double
# is unconfirmed until a later run reads the same; a half means the earlier reading was the double.
$readFile = Join-Path $root 'dist\spend-readings.json'
$prevRead = @{}
if (Test-Path $readFile) { (Get-Content $readFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $prevRead[$_.Name] = $_.Value } }
$nowIso = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mmZ')
$flags = @()
foreach ($d in ($subDay.Keys | Sort-Object)) {
  $p = $prevRead[$d]
  if (-not $p) { continue }
  foreach ($k in 'all', 'shared') {
    $was = [double]$p.$k; $is = [double]$subDay[$d].$k
    if ($was -lt 5 -or $is -lt 5) { continue }
    $r = $is / $was
    $what = if ([Math]::Abs($r - 2) -le 0.004) { 'TWICE' } elseif ([Math]::Abs($r - 0.5) -le 0.001) { 'HALF' } else { $null }
    if ($what) { $flags += "  {0} {1,-12} {2,9:N2} is {3} the {4:N2} read at {5}" -f $d, $(if ($k -eq 'all') { 'subscription' } else { 'shared' }), $is, $what, $was, $p.at }
  }
}
""
"readings against the last run ({0}):" -f $(if ($prevRead.Count) { 'dist\spend-readings.json' } else { 'none stored yet' })
if ($flags.Count) {
  $flags
  "  ! Cost Management has returned whole days doubled before and corrected them a day later:"
  "    a TWICE figure is unconfirmed until a later run reads the same; a HALF means the last run read a double"
} else { "  no day reads exactly twice or half its last reading" }
$store = [ordered]@{}
foreach ($d in ($subDay.Keys | Sort-Object)) { $store[$d] = [ordered]@{ at = $nowIso; all = [Math]::Round([double]$subDay[$d].all, 2); shared = [Math]::Round([double]$subDay[$d].shared, 2) } }
foreach ($d in $prevRead.Keys) { if (-not $store.Contains($d) -and $d -ge $today.AddDays(-40).ToString('yyyyMMdd')) { $store[$d] = $prevRead[$d] } }
$store | ConvertTo-Json -Depth 4 | Set-Content $readFile -Encoding utf8

# ── the two limits, stated by the user on 29 Sep ─────────────────────────────────────────────
# This campaign has $2,000 a month; the subscription as a whole is capped at $5,000. Other
# projects share the subscription and their rate is not ours to set -- in September it went from
# about $45 a day to about $100 a day in the last week -- so the subscription side is projected
# from their recent rate, with a margin, because this data runs about a day behind.
$daysInMonth = [DateTime]::DaysInMonth($today.Year, $today.Month)
$left = $daysInMonth - $today.Day + 1
function Other($d) { return [double]$subDay[$d].all - (Mine $d) }
# Complete means before yesterday: data lags about a day, and a part-reported yesterday would
# pull the average down. Yesterday's missing part is covered by counting one extra day below.
$cutoff = $today.AddDays(-1).ToString('yyyyMMdd')
$complete = @($subDay.Keys | Sort-Object | Where-Object { $_ -lt $cutoff } | Select-Object -Last 7)
# A seven-day average is slow to see a jump: on 3 Oct it still read $124 a day from 24-30 Sep while
# 2 Oct alone, part-reported, was $267. So the last three days, part-reported ones included, are
# averaged too, and the higher of the two is used. Part-reported days can only pull that down.
$recent = @($subDay.Keys | Sort-Object | Select-Object -Last 3)
$avg7 = if ($complete.Count) { ($complete | ForEach-Object { Other $_ } | Measure-Object -Average).Average } else { [double]::PositiveInfinity }
$avg3 = ($recent | ForEach-Object { Other $_ } | Measure-Object -Average).Average
if (-not $complete.Count) { "  ! no complete days in the window: the other projects' rate is unknown, so nothing is allowed" }
$otherRate = [Math]::Max($avg7, $avg3)
$lag = if ($today.Day -gt 1) { 1 } else { 0 }
$projected = $total + ($left + $lag) * $otherRate
$campaignLeft = $CampaignCap - $mine
$subscriptionLeft = ($SubscriptionCap * $Margin) - $projected
$allowance = [Math]::Min($campaignLeft, $subscriptionLeft)
""
"limits:"
"  campaign        {0,8:N2} of {1:N0} spent            -> {2,8:N2} left" -f $mine, $CampaignCap, $campaignLeft
"  subscription    {0,8:N2} so far; other projects at {1:N2}/day, the higher of:" -f $total, $otherRate
"                    {0,8:N2}/day over {1} complete days ({2} to {3})" -f $avg7, $complete.Count, ($complete | Select-Object -First 1), ($complete | Select-Object -Last 1)
"                    {0,8:N2}/day over the last 3 days ({1}; the latest are part-reported)" -f $avg3, ($recent -join ', ')
"                  projected month-end {0:N2} ({1} day(s) at that rate, incl. {2} for reporting lag)" -f $projected, ($left + $lag), $lag
"                  + this campaign  vs {0:N0} x {1} = {2:N0}  -> {3,8:N2} left" -f $SubscriptionCap, $Margin, ($SubscriptionCap * $Margin), $subscriptionLeft
"  allowance for the rest of the month: {0:N2} USD  ({1} day(s) left, {2:N2}/day)" -f $allowance, $left, ($allowance / [Math]::Max(1, $left))
if ($allowance -ge $NeedToday) {
  "GO: {0:N2} available, {1:N2} needed for today's work" -f $allowance, $NeedToday
  Remove-Item $tmp, $errf -ErrorAction SilentlyContinue
  exit 0
}
"STOP: {0:N2} available, {1:N2} needed -- do not generate" -f $allowance, $NeedToday
Remove-Item $tmp, $errf -ErrorAction SilentlyContinue
exit 3
