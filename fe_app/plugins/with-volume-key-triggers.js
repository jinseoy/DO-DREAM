const { withMainActivity } = require('@expo/config-plugins');

const K_IMPORTS_KOTLIN = `
import android.view.KeyEvent
import com.github.kevinejohn.keyevent.KeyEventModule
`.trim();

const K_METHODS_KOTLIN = `
  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    KeyEventModule.getInstance().onKeyUpEvent(keyCode, event)
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      return true
    }
    return super.onKeyUp(keyCode, event)
  }

  override fun onKeyMultiple(keyCode: Int, repeatCount: Int, event: KeyEvent?): Boolean {
    if (event != null) {
      KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event)
    }
    return super.onKeyMultiple(keyCode, repeatCount, event)
  }
`.trim();

const J_IMPORTS_JAVA = `
import android.view.KeyEvent;
import com.github.kevinejohn.keyevent.KeyEventModule;
`.trim();

const J_METHODS_JAVA = `
  @Override
  public boolean onKeyDown(int keyCode, KeyEvent event) {
    KeyEventModule.getInstance().onKeyDownEvent(keyCode, event);
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      return true;
    }
    return super.onKeyDown(keyCode, event);
  }

  @Override
  public boolean onKeyUp(int keyCode, KeyEvent event) {
    KeyEventModule.getInstance().onKeyUpEvent(keyCode, event);
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      return true;
    }
    return super.onKeyUp(keyCode, event);
  }

  @Override
  public boolean onKeyMultiple(int keyCode, int repeatCount, KeyEvent event) {
    KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event);
    return super.onKeyMultiple(keyCode, repeatCount, event);
  }
`.trim();

function injectOnce(contents, needleRegex, insert) {
  if (contents.includes(insert)) return contents;
  const match = contents.match(needleRegex);
  if (!match) return contents;
  const idx = contents.indexOf(match[0]) + match[0].length;
  return contents.slice(0, idx) + '\n' + insert + '\n' + contents.slice(idx);
}

module.exports = function withVolumeKeyTriggers(config) {
  return withMainActivity(config, (mod) => {
    const isKotlin = mod.modResults.language === 'kt';
    let src = mod.modResults.contents;

    // imports 주입
    if (isKotlin) {
      if (!src.includes('import android.view.KeyEvent')) {
        // 첫 import 블록 뒤에 삽입
        src = injectOnce(src, /\nimport[\s\S]*?\n/, K_IMPORTS_KOTLIN);
        if (!src.includes('import android.view.KeyEvent')) {
          // import 블록이 없으면 package 다음 줄에 추가
          src = src.replace(/package [^\n]+\n/, (m) => m + K_IMPORTS_KOTLIN + '\n');
        }
      }
    } else {
      if (!src.includes('import android.view.KeyEvent')) {
        src = injectOnce(src, /\nimport[\s\S]*?\n/, J_IMPORTS_JAVA);
        if (!src.includes('import android.view.KeyEvent')) {
          src = src.replace(/package [^\n]+\n/, (m) => m + J_IMPORTS_JAVA + '\n');
        }
      }
    }

    // 클래스 본문에 메서드 주입
    const classOpen = src.match(/class\s+MainActivity[^{]*\{/);
    if (classOpen) {
      const idx = src.indexOf(classOpen[0]) + classOpen[0].length;
      const head = src.slice(0, idx);
      const tail = src.slice(idx);

      if (isKotlin) {
        if (!src.includes('override fun onKeyDown(')) {
          src = head + '\n' + K_METHODS_KOTLIN + '\n' + tail;
        }
      } else {
        if (!src.includes('boolean onKeyDown(') && !src.includes('onKeyDown(int keyCode')) {
          src = head + '\n' + J_METHODS_JAVA + '\n' + tail;
        }
      }
    }

    mod.modResults.contents = src;
    return mod;
  });
};
