using ExpressServiceControlPanel.objects;
using ExpressServiceControlPanel.Services;
using System;
using System.Configuration.Install;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Topshelf;

namespace ExpressServiceControlPanel
{
    public partial class MainWindow : Window
    {
        private readonly HttpClient http = new HttpClient();
        private JsonSetting settings;
        private ServiceRunner serviceRunner = new ServiceRunner();
        private string exePath => Assembly.GetExecutingAssembly().Location;

        public MainWindow()
        {
            InitializeComponent();
            Loaded += async (_, __) =>
            {
                this.settings = await new JsonSetting().load();
                serviceRunner.ServiceChecker.StatusChanged += async (isRunning) =>
                {
                    await Dispatcher.InvokeAsync(async () =>
                    {
                        await LoadView();
                    });
                };

                serviceRunner.ServerWatcher.StatusChanged += async (isRunning) =>
                {
                    await Dispatcher.InvokeAsync(async () =>
                    {
                        await LoadView();
                    });
                };
                await LoadView();

            };
            ChkLogSql.Checked += async (_, __) => await UpdateLogSqlAsync();
            ChkLogSql.Unchecked += async (_, __) => await UpdateLogSqlAsync();
 
        }

        async Task LoadView()
        {
            BtnUninstall.IsEnabled = serviceRunner.ServiceChecker.Exists();
            BtnInstall.IsEnabled = !serviceRunner.ServiceChecker.Exists();
            BtnSave.IsEnabled = serviceRunner.ServerWatcher._lastStatus == true;
            lblRootPath.Text = $"Root Path: {Methods.RootBath()}";
            if (serviceRunner.ServiceChecker.Exists() && serviceRunner.ServiceChecker.IsRunning() && serviceRunner.ServerWatcher._lastStatus == true)
            {
                this.settings = await this.settings.load();
                pre.Visibility = LblStatus.Visibility = ChkLogSql.Visibility= Visibility.Visible;
                stkPort.Visibility = Visibility.Visible;
                await LoadSettingsAsync();
                await LoadPortAsync();
                StartLogStream();
                
            }else {       
                pre.Visibility =stkPort.Visibility= LblStatus.Visibility= ChkLogSql.Visibility= Visibility.Collapsed;
                LblServiceStatus.Text = serviceRunner.ServiceChecker.Exists() ? serviceRunner.ServiceChecker.IsRunning() ? "Service is running." : "Service is installed but not running." : "Service is not installed.";
            }
        }

        private async Task LoadSettingsAsync()
        {
            try
            {
                var data = await http.GetFromJsonAsync<JsonElement>(this.settings.Join("settings"));
                if (data.TryGetProperty("logSql", out var logSql))
                    ChkLogSql.IsChecked = logSql.GetBoolean();
            }
            catch
            {
                LblStatus.Text = "⚠️ Failed to load service settings.";
            }
        }

        private async Task UpdateLogSqlAsync()
        {
            try
            {
                await http.PostAsJsonAsync(this.settings.Join("settings"), new
                {
                    logSql = ChkLogSql.IsChecked ?? false
                });
            }
            catch
            {
                SnackbarMessage("Failed to update LogSql setting.");
            }
        }

        private async Task LoadPortAsync()
        {
            try
            {
                var data = await http.GetFromJsonAsync<JsonElement>(this.settings.Join("port"));
                if (data.TryGetProperty("port", out var port))
                    TxtPort.Text = port.GetInt32().ToString();
                if (data.TryGetProperty("host", out var host) &&
                    data.TryGetProperty("pHost", out var pHost))
                {
                    LblStatus.Text = $"🌐 Local: http://{host.GetString()}:{port.GetInt32()}\n" +
                                     $"🌐 Public: http://{pHost.GetString()}:{port.GetInt32()} (requires port forwarding)";
                }
            }
            catch
            {
                LblStatus.Text = "⚠️ Failed to fetch current port.";
            }
        }

        private async void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            if (!int.TryParse(TxtPort.Text, out var port))
            {
                SnackbarMessage("Invalid port number.");
                return;
            }

            LblStatus.Text = "💾 Saving...";
            try
            {
                BtnSave.IsEnabled = false;
                var res = await http.PostAsJsonAsync(this.settings.Join("port"), new { port });
                var data = await res.Content.ReadFromJsonAsync<JsonElement>();
                var msg = data.TryGetProperty("message", out var message)
                    ? message.GetString()
                    : "Port updated successfully.";
                LblStatus.Text = msg;
                 this.serviceRunner.ServerWatcher._lastStatus = null;
            }
            catch
            {
                LblStatus.Text = "❌ Error saving port.";
            }
        }

        private async void BtnInstall_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                LblServiceStatus.Text = "Installing service...";
                if (serviceRunner.ServiceChecker.Exists())
                {
                    LblServiceStatus.Text = "Service already installed";
                    return;
                }
                serviceRunner.Install();
                LblServiceStatus.Text = "Service installed successfully!";
            }
            catch (Exception ex)
            {
                LblServiceStatus.Text = "Error installing service: " + ex.Message;
            }
          
        }

        private async void BtnUninstall_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                LblServiceStatus.Text = "Uninstalling service...";
                serviceRunner.Uninstall();
                LblServiceStatus.Text = "Service uninstalled successfully!";
            }
            catch (Exception ex)
            {
                LblServiceStatus.Text = "Error uninstalling service: " + ex.Message;
            }
     
        }

        private async void StartLogStream()
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var stream = await http.GetStreamAsync(this.settings.Join("logs"));
                    using var reader = new StreamReader(stream);

                    while (!reader.EndOfStream)
                    {
                        var line = await reader.ReadLineAsync();
                        if (string.IsNullOrWhiteSpace(line)) continue;

                        try
                        {
                            
                            var json = JsonDocument.Parse(line.Replace("data: ", "")).RootElement;
                            var type = json.GetProperty("type").GetString();
                            var message = json.GetProperty("message").GetString();
                            Dispatcher.Invoke(() => AddConsoleLine(message, type));
                        }
                        catch
                        {
                            Dispatcher.Invoke(() => AddConsoleLine(line, "info"));
                        }
                    }
                }
                catch
                {
                    Dispatcher.Invoke(() => AddConsoleLine("⚠️ Disconnected from logs.", "error"));
                }
            });
        }

        private void AddConsoleLine(string message, string type)
        {
            var color = type switch
            {
                "error" => Brushes.OrangeRed,
                "info" => Brushes.Cyan,
                _ => Brushes.LightGreen
            };

            var text = new TextBlock
            {
                Text = message,
                Foreground = color,
                FontFamily = new FontFamily("Consolas"),
                Margin = new Thickness(0, 0, 0, 2)
            };
            ConsolePanel.Children.Add(text);

            // Auto-scroll
            if (ConsolePanel.Parent is ScrollViewer sv)
                sv.ScrollToEnd();
        }

        private void SnackbarMessage(string msg)
        {
            MaterialDesignThemes.Wpf.SnackbarMessageQueue queue = new();
            queue.Enqueue(msg);
            var snack = new MaterialDesignThemes.Wpf.Snackbar
            {
                MessageQueue = queue,
                VerticalAlignment = VerticalAlignment.Bottom,
                Margin = new Thickness(20)
            };
            (Content as Grid)?.Children.Add(snack);
        }
    }
}
