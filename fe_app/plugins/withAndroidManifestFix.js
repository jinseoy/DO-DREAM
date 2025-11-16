// plugins/withAndroidManifestFix.js

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidManifestFix(config) {
  console.log('[withAndroidManifestFix] plugin start');
  
  return withAndroidManifest(config, (modConfig) => {
    try {
      const androidManifest = modConfig.modResults;

      console.log('[withAndroidManifestFix] Processing manifest...');

      // manifest가 root로 감싸져 있는 경우 처리
      let manifestNode = androidManifest;
      
      // root 태그가 있으면 제거하고 manifest를 직접 사용
      if (androidManifest.root && androidManifest.root.manifest) {
        manifestNode = androidManifest.root.manifest[0];
        // root를 제거하고 manifest를 루트로 만듦
        modConfig.modResults = {
          manifest: manifestNode
        };
      } else if (!androidManifest.manifest) {
        console.error('[withAndroidManifestFix] Invalid manifest structure');
        return modConfig;
      }

      // 이제 정상적인 구조로 작업
      const manifest = modConfig.modResults.manifest || modConfig.modResults;

      // manifest에 tools namespace 추가
      if (!manifest.$) {
        manifest.$ = {};
      }
      
      manifest.$['xmlns:android'] = 'http://schemas.android.com/apk/res/android';
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      manifest.$['package'] = 'com.dodream.app';
      
      console.log('[withAndroidManifestFix] Added namespaces');

      // application 태그 찾기
      if (!manifest.application || !manifest.application[0]) {
        console.error('[withAndroidManifestFix] No application tag found');
        return modConfig;
      }

      const application = manifest.application[0];
      
      if (!application.$) {
        application.$ = {};
      }
      
      // tools:replace 추가
      application.$['tools:replace'] = 'android:appComponentFactory';
      application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';
      
      console.log('[withAndroidManifestFix] Successfully modified manifest');

      return modConfig;
    } catch (error) {
      console.error('[withAndroidManifestFix] Error:', error.message);
      console.error(error.stack);
      return modConfig;
    }
  });
};