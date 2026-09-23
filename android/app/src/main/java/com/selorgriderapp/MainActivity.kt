package com.selorgriderapp

import android.graphics.Color
import android.os.Bundle
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SelorgRiderApp"

  override fun onCreate(savedInstanceState: Bundle?) {
    // Avoid react-native-screens fragment restore crashes after process death / reload.
    super.onCreate(null)
    // Keep the window white before JS paints — API 35+ emulators otherwise show black.
    window.decorView.setBackgroundColor(Color.WHITE)
    WindowCompat.setDecorFitsSystemWindows(window, true)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
