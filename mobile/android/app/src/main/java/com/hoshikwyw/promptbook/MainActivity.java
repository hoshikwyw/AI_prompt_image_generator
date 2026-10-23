package com.hoshikwyw.promptbook;

import android.content.res.Configuration;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * The whole app is one WebView showing the deployed site.
 *
 * Capacitor does not handle the Back button, so without this Android's default
 * applies: Back leaves the app, and someone three pages into the library is
 * thrown out instead of going back a page. Here Back walks the WebView's
 * history first, and only leaves the app from the first page.
 *
 * It also keeps the native surfaces — window, WebView background, system bars —
 * in the phone's light or dark mode, matching the site.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySystemTheme(getResources().getConfiguration());

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

    /**
     * uiMode is in the manifest's configChanges, so switching the phone between
     * light and dark does not restart the activity — the theme set at launch
     * would stay. The site inside the WebView follows by itself (CSS
     * prefers-color-scheme); the native surfaces are re-applied here. This runs
     * after super, so it also wins over the SystemBars plugin, which replays the
     * icon style it resolved at launch instead of re-reading the mode.
     */
    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemTheme(newConfig);
    }

    private void applySystemTheme(Configuration config) {
        boolean night =
            (config.uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        // Resolved against the given configuration, so values-night is picked
        // correctly even while this activity's own resources are mid-change.
        int background = ContextCompat.getColor(createConfigurationContext(config), R.color.app_background);

        Window window = getWindow();
        window.setBackgroundDrawable(new ColorDrawable(background));
        window.getDecorView().setBackgroundColor(background);
        // Android 15+ draws the app edge to edge and ignores these colours.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            window.setStatusBarColor(background);
            window.setNavigationBarColor(background);
        }

        // "Light" bars means dark icons, for a light background.
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, window.getDecorView());
        bars.setAppearanceLightStatusBars(!night);
        bars.setAppearanceLightNavigationBars(!night);

        // The colour shown before the page paints, and behind it while it loads.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(background);
        }
    }
}
