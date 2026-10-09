$ErrorActionPreference = 'Stop'
$all = @($args)
if ($all.Count -lt 4 -or $all[0] -ne '-JobFile' -or $all[2] -ne '--') { [Console]::Error.WriteLine('usage: jobwrap.ps1 -JobFile <path> -- <command> [args...]'); exit 2 }
$JobFile = $all[1]
$Rest = @($all | Select-Object -Skip 3)
if ($Rest.Count -eq 0) { [Console]::Error.WriteLine('jobwrap: no command given'); exit 2 }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class BenchJob {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern IntPtr CreateJobObject(IntPtr attributes, string name);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool QueryInformationJobObject(IntPtr job, int infoClass, IntPtr info, int length, out int returned);

  [DllImport("kernel32.dll")]
  static extern IntPtr GetCurrentProcess();

  public static IntPtr Create() {
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
    if (!AssignProcessToJobObject(job, GetCurrentProcess())) throw new System.ComponentModel.Win32Exception();
    return job;
  }

  public static void Assign(IntPtr job, IntPtr process) {
    if (!AssignProcessToJobObject(job, process)) throw new System.ComponentModel.Win32Exception();
  }

  public static long[] Members(IntPtr job) {
    const int JobObjectBasicProcessIdList = 3;
    int capacity = 4096;
    int size = 8 + IntPtr.Size * capacity;
    IntPtr buffer = Marshal.AllocHGlobal(size);
    try {
      int returned;
      if (!QueryInformationJobObject(job, JobObjectBasicProcessIdList, buffer, size, out returned)) throw new System.ComponentModel.Win32Exception();
      int count = Marshal.ReadInt32(buffer, 4);
      long[] pids = new long[count];
      for (int i = 0; i < count; i++) pids[i] = Marshal.ReadIntPtr(buffer, 8 + i * IntPtr.Size).ToInt64();
      return pids;
    } finally {
      Marshal.FreeHGlobal(buffer);
    }
  }
}
'@

$job = [BenchJob]::Create()

$command = $Rest[0]
$arguments = if ($Rest.Count -gt 1) { $Rest[1..($Rest.Count - 1)] } else { @() }
$info = [System.Diagnostics.ProcessStartInfo]::new()
if ($command -match '\.(cmd|bat)$') {
  $info.FileName = $env:ComSpec
  foreach ($a in @('/d', '/c', $command) + $arguments) { $info.ArgumentList.Add($a) }
} else {
  $info.FileName = $command
  foreach ($a in $arguments) { $info.ArgumentList.Add($a) }
}
$info.UseShellExecute = $false
$info.WorkingDirectory = (Get-Location).Path

$process = [System.Diagnostics.Process]::Start($info)
try { [BenchJob]::Assign($job, $process.Handle) } catch { }
$process.WaitForExit()
$code = $process.ExitCode

$lines = foreach ($memberPid in [BenchJob]::Members($job)) {
  if ($memberPid -eq $PID) { continue }
  $row = Get-CimInstance Win32_Process -Filter "ProcessId=$memberPid" -ErrorAction SilentlyContinue
  if (-not $row -or -not $row.CreationDate) { continue }
  [pscustomobject]@{ pid = [int]$memberPid; created = $row.CreationDate.ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
}
if ($lines) { Add-Content -LiteralPath $JobFile -Value $lines -Encoding utf8 }

exit $code
