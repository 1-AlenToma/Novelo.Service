using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;


namespace ExpressServiceControlPanel.objects
{
    internal class JsonSetting
    {
        public int port { get; set; } = 5002;
        private string SettingsPath => Methods.ConfigPath();

        public string Join(params string[] items) { 
            return $"http://localhost:{this.port}/{string.Join("/", items)}";
        }


        private async Task SaveSettingsAsync(JsonSetting Settings)
        {
            try
            {
                var json = JsonSerializer.Serialize(Settings, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(SettingsPath, json);
            }
            catch (Exception ex)
            {
             //   throw ex;
            }
        }

        public async Task<JsonSetting> load()
        {
            JsonSetting Settings = new JsonSetting();
            try
            {
                if (File.Exists(SettingsPath))
                {
                    var json = await File.ReadAllTextAsync(SettingsPath);
                    Settings = JsonSerializer.Deserialize<JsonSetting>(json) ?? new JsonSetting();
                }
                else
                {
                    Settings = new JsonSetting();
                    await SaveSettingsAsync(Settings); // create defaults if missing
                }

            }
            catch (Exception ex)
            {
              //  throw ex;
            }

            return Settings;

        }
    }
}
