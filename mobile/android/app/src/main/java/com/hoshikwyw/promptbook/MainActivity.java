package com.hoshikwyw.promptbook;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * The whole app is one WebView showing the deployed site.
 *
 * Capacitor does not handle the Back button, so without this Android's default
 * applies: Back leaves the app, and someone three pages into the library is
 * thrown out instead of going back a page. Here Back walks the WebView's
 * history first, and only leaves the app from the first page.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                // Nothing to go back to: hand Back to the system default. It is
                // re-enabled straight after, because on Android 12+ the default
                // only sends the app to the background — and when it returns,
                // Back must still walk history rather than exit at once.
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
