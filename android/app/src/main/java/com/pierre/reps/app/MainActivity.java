package com.pierre.reps.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // plugins locaux : avant super.onCreate
        registerPlugin(RepsWidgetPlugin.class);
        registerPlugin(KeepAwakePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
