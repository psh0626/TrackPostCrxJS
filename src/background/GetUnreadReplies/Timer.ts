
export class GlobalTimer {

  static IsRunning = false;
  static Interval = 15000;
  static Callback: (() => void) | undefined = undefined;
  static Timeout: NodeJS.Timeout | undefined = undefined;

  constructor(intervalMs: number, callback: ()=>void) {
    GlobalTimer.Interval = intervalMs;
    GlobalTimer.Callback = callback;
  }
  static Start() {
    if (GlobalTimer.IsRunning) {
      return;
    }
    GlobalTimer.IsRunning = true;
    GlobalTimer.Loop();
  }
  private static Loop() {
    if (!GlobalTimer.IsRunning && GlobalTimer.Timeout) {
      GlobalTimer.Stop();
      return;
    }
    if (!GlobalTimer.Callback) {
      GlobalTimer.Stop();
      return;
    }
    GlobalTimer.Timeout = setTimeout(() => {
      if (!GlobalTimer.IsRunning) {
        GlobalTimer.Stop();
        return;
      }
      GlobalTimer.Callback!();
      GlobalTimer.Loop();
    }, GlobalTimer.Interval);
  }
  static Stop() {
    GlobalTimer.Interval = 15000;
    GlobalTimer.IsRunning = false;
    GlobalTimer.Callback = undefined;
    if (GlobalTimer.Timeout) {
      clearTimeout(GlobalTimer.Timeout);
    }
    GlobalTimer.Timeout = undefined;
  }
}
