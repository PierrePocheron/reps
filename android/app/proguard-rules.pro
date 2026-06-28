# ─── Reps — ProGuard / R8 rules ──────────────────────────────────────────────

# Conserver les numéros de ligne pour les stack traces Sentry
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ─── Capacitor ────────────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# ─── Firebase ─────────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ─── AdMob ────────────────────────────────────────────────────────────────────
-keep class com.google.android.gms.ads.** { *; }

# ─── WebView JavaScript Interface ─────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ─── Serialisation JSON (Gson / Jackson si utilisés par des plugins) ──────────
-keepattributes Signature
-keepattributes *Annotation*
-keep class sun.misc.Unsafe { *; }
