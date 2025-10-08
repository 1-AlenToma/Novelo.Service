using ExpressServiceControlPanel.objects;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExpressServiceControlPanel.Services
{
    using System;
    using System.Diagnostics;
    using System.IO;

    public class ServiceRunner
    {
        private string nodePath = @"C:\Program Files\nodejs\node.exe";
        private string installPath = Path.Combine(Methods.ExpressPath(), "service.js");
        private string uninstallPath = Path.Combine(Methods.ExpressPath(), "uninstall.js");
        public ServiceChecker ServiceChecker = new ServiceChecker();
        public ServerWatcher ServerWatcher = new ServerWatcher();

        public void Install()
        {
            RunNodeScript(installPath);
        }

        public void Uninstall()
        {
            RunNodeScript(uninstallPath);
        }

        private void RunNodeScript(string scriptPath)
        {
            if (!File.Exists(nodePath))
            {
                Console.WriteLine("Node.js not found at: " + nodePath);
                return;
            }

            if (!File.Exists(scriptPath))
            {
                Console.WriteLine("Script not found: " + scriptPath);
                return;
            }
            var test = nodePath + " " + scriptPath;
            var process = new Process();
            process.StartInfo.FileName = nodePath;
            process.StartInfo.Arguments = $" \"{scriptPath}\"";
            process.StartInfo.UseShellExecute = false;
            process.StartInfo.CreateNoWindow = true;
            process.StartInfo.RedirectStandardOutput = true;
            process.StartInfo.RedirectStandardError = true;

            process.OutputDataReceived += (s, e) => { if (e.Data != null) Console.WriteLine(e.Data); };
            process.ErrorDataReceived += (s, e) => { if (e.Data != null) Console.WriteLine(e.Data); };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            process.WaitForExit();
            Console.WriteLine($"Script {Path.GetFileName(scriptPath)} finished with exit code {process.ExitCode}");
        }
    }


}
