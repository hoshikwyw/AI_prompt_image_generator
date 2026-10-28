package com.hoshikwyw.promptbook;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

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
        keepHttpErrorsOnTheSite();
        handleDownloads();

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
     * Capacitor swaps in the "can't reach Promptbook" page for any main-frame
     * HTTP error, not only for a lost connection — so a 404 for a deleted
     * prompt, or a 500 while the database is down, told someone who was online
     * to check their internet, and Back led to the same error again. The site
     * has its own not-found and error pages; let them show. Real network
     * failures still arrive through onReceivedError and get error.html.
     */
    private void keepHttpErrorsOnTheSite() {
        Bridge bridge = getBridge();
        if (bridge == null) return;
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                // Deliberately not calling super: that is what loads error.html.
            }
        });
    }

    /**
     * A WebView ignores downloads unless told what to do with them, so the
     * collection export and the API's CSV/JSON downloads did nothing at all when
     * tapped. They are public URLs, so the phone's browser can fetch them and
     * save the file the usual way.
     */
    private void handleDownloads() {
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) return;
        bridge.getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (ActivityNotFoundException ignored) {
                // No browser installed: nothing else could save it either.
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
