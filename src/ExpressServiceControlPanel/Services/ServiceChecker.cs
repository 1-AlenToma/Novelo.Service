using System;
using System.Collections.Generic;
using System.Linq;
using System.ServiceProcess;
using System.Text;
using System.Threading.Tasks;
using System.Timers;

namespace ExpressServiceControlPanel.Services
{
    public class ServiceChecker : IDisposable
    {
        public void Dispose()
        {
            _timer?.Stop();
            _timer?.Dispose();
        }
        ~ServiceChecker()
        {
            Dispose();
        }
  
        private readonly System.Timers.Timer _timer;
        private const string serviceName = "noveloservice.exe";
        public event Action<Boolean> StatusChanged = delegate { };
        public Boolean? _lastStatus = null;
        public ServiceChecker()
        {
            _timer = new System.Timers.Timer(1000);
            _timer.Elapsed += TimerElapsed;
            _timer.AutoReset = true;
            _timer.Start();
        }

        private void TimerElapsed(object? sender, ElapsedEventArgs e)
        {
            try
            {

                var currentStatus = this.Exists() && this.IsRunning();

                if (_lastStatus == null || currentStatus != _lastStatus)
                {
                    _lastStatus = currentStatus;
                    StatusChanged?.Invoke(currentStatus);
                }
            }
            catch (InvalidOperationException)
            {
                // Service doesn't exist
                if (_lastStatus != null)
                {
                    _lastStatus = null;
                    StatusChanged?.Invoke(false);
                }
            }
        }

        /// <summary>
        /// Checks if a Windows service exists.
        /// </summary>
        public bool Exists()
        {
            try
            {
                using var sc = new ServiceController(serviceName);
                var status = sc.Status; // will throw if service doesn't exist
                return true;
            }
            catch (InvalidOperationException)
            {
                return false;
            }
        }

        /// <summary>
        /// Checks if a Windows service is currently running.
        /// </summary>
        public bool IsRunning()
        {
            try
            {
                using var sc = new ServiceController(serviceName);
                return sc.Status == ServiceControllerStatus.Running;
            }
            catch (InvalidOperationException)
            {
                return false; // service doesn't exist
            }
        }
    }
}
