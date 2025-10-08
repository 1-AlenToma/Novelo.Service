using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Timers;
using static System.Net.WebRequestMethods;

namespace ExpressServiceControlPanel.Services
{
    public class ServerWatcher
    {
        private readonly System.Timers.Timer _timer;
        private readonly HttpClient http = new HttpClient();
        public event Action<Boolean> StatusChanged = delegate { };
        public Boolean? _lastStatus = null;

        public ServerWatcher()
        {
            _timer = new System.Timers.Timer(1000);
            _timer.Elapsed += TimerElapsed;
            _timer.AutoReset = true;
            _timer.Start();
        }

        private async void TimerElapsed(object? sender, ElapsedEventArgs e)
        {
            _timer.Stop();

            try
            {
                var jsonSetting =await new objects.JsonSetting().load();
                await http.GetAsync(jsonSetting.Join("ping"));

                var currentStatus = true;

                if (_lastStatus == null || currentStatus != _lastStatus)
                {
                    _lastStatus = currentStatus;
                    StatusChanged?.Invoke(currentStatus);
                }
            }
            catch (Exception)
            {
                // Service doesn't exist
                if (_lastStatus != null)
                {
                    _lastStatus = null;
                    StatusChanged?.Invoke(false);
                }
            }
            finally
            {
                _timer.Start();
            }
        }
    }
}
