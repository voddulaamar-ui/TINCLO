# TINCLO Android App

This project supports both web and Android from the same React source code.

## Web

```bash
npm run dev
```

```bash
npm run build
```

## Android

Android is powered by Capacitor. The native project lives in `android/`.

For emulator development, `.env.android` points API calls to:

```text
http://10.0.2.2:5002/api
```

That reaches the backend running on your computer from the Android emulator. For a real phone, change `.env.android` to your computer LAN IP or a hosted API URL.

Build and sync the Android app:

```bash
npm run build:android
```

Open in Android Studio:

```bash
npm run android:open
```

Build a debug APK from the Android folder:

```bash
cd android
gradlew.bat assembleDebug
```

The APK will be created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Required Tools

To compile APKs locally, install:

- Java JDK
- Android Studio
- Android SDK

Then set `JAVA_HOME` to your JDK installation path.
