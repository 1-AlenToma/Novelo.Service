using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ExpressServiceControlPanel.objects
{
    internal static class Methods
    {
        public static string JoinPath(this string str, params string[] items)
        {
            return System.IO.Path.Combine(new[] { str }.Concat(items).ToArray());
        }

        public static string AppFolder => Path.GetDirectoryName(Process.GetCurrentProcess().MainModule!.FileName)!;


        public static string RootBath()
        {
            if (!AppFolder.Contains("ExpressServiceControlPanel"))
            {
                return AppFolder;
            }
            return AppFolder.Substring(0, AppFolder.IndexOf("ExpressServiceControlPanel"));
        }

        public static string ConfigPath()
        {
            return ExpressPath().JoinPath("config.json");
        }

        public static string ExpressPath()
        {
            if (File.Exists(RootBath().JoinPath("config.json")))
            {
                return RootBath();
            }

            return RootBath().JoinPath("express");
        }
    }
}
