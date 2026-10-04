package com.pierre.reps.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RepsWidgetPlugin.class); // plugin local : avant super.onCreate
        super.onCreate(savedInstanceState);
    }
}
