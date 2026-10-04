package com.pierre.reps.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import java.util.TimeZone;

/**
 * Widget d'écran d'accueil (#36) : série en cours et séances de la semaine.
 * Les chiffres viennent de l'appli (RepsWidgetPlugin) ; le widget les remet à 0 seul quand la série
 * a cassé (validUntil dépassé) ou qu'une nouvelle semaine commence (weekStart).
 */
public class RepsWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "reps_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences p = context.getSharedPreferences(PREFS, 0);
        long now = System.currentTimeMillis();
        long today = (now + TimeZone.getDefault().getOffset(now)) / 86_400_000L; // = epochDay() côté JS
        long monday = today - Math.floorMod(today + 3, 7L); // 01/01/1970 était un jeudi

        int streak = today <= p.getLong("validUntil", 0) ? p.getInt("streak", 0) : 0;
        int weekDone = p.getLong("weekStart", 0) == monday ? p.getInt("weekDone", 0) : 0;
        int weekGoal = p.getInt("weekGoal", 0);
        boolean weekly = p.getBoolean("weekly", false);

        String streakLabel = weekly
            ? (streak > 1 ? "semaines à l'objectif" : "semaine à l'objectif")
            : (streak > 1 ? "jours d'affilée" : "jour d'affilée");
        String week = weekGoal > 0
            ? Math.min(weekDone, weekGoal) + "/" + weekGoal + " cette semaine"
            : weekDone + (weekDone > 1 ? " séances" : " séance") + " cette semaine";

        // Tap : ouvre l'appli sur l'accueil (écouté par Layout via appUrlOpen)
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("com.pierre.reps.app://home"), context, MainActivity.class);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        for (int id : ids) {
            RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_reps);
            v.setTextViewText(R.id.widget_streak, String.valueOf(streak));
            v.setTextViewText(R.id.widget_streak_label, streakLabel);
            v.setTextViewText(R.id.widget_week, week);
            v.setOnClickPendingIntent(R.id.widget_root, tap);
            manager.updateAppWidget(id, v);
        }
    }

    /** Redessine tous les widgets posés (après une séance, au lancement de l'appli). */
    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, RepsWidgetProvider.class));
        if (ids.length > 0) new RepsWidgetProvider().onUpdate(context, manager, ids);
    }
}
