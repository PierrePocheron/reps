package com.pierre.reps.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reçoit les chiffres du widget depuis l'appli web (src/utils/widget.ts) et le redessine. */
@CapacitorPlugin(name = "RepsWidget")
public class RepsWidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        JSObject d = call.getData();
        getContext().getSharedPreferences(RepsWidgetProvider.PREFS, 0).edit()
            .putInt("streak", d.optInt("streak"))
            .putBoolean("weekly", d.optBoolean("weekly"))
            .putInt("weekDone", d.optInt("weekDone"))
            .putInt("weekGoal", d.optInt("weekGoal"))
            .putLong("validUntil", d.optLong("validUntil"))
            .putLong("weekStart", d.optLong("weekStart"))
            .apply();
        RepsWidgetProvider.refresh(getContext());
        call.resolve();
    }
}
