import videojs from 'video.js';
import {version as VERSION} from '../package.json';
import './touchOverlay.js';
import window from 'global/window';

// Default options for the plugin.
const defaults = {
  fullscreen: {
    enterOnRotate: true,
    exitOnRotate: true,
    lockOnRotate: true,
    iOS: false
  },
  touchControls: {
    seekSeconds: 10,
    tapTimeout: 300,
    disableOnEnd: false
  }
};

const screen = window.screen;

const angle = () => {
  // iOS
  if (typeof window.orientation === 'number') {
    return window.orientation;
  }
  // Android
  if (screen && screen.orientation && screen.orientation.angle) {
    return window.orientation;
  }
  videojs.log('angle unknown');
  return 0;
};

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;

/**
 * Add UI and event listeners
 *
 * @function onPlayerReady
 * @param    {Player} player
 *           A Video.js player object.
 *
 * @param    {Object} [options={}]
 *           A plain object containing options for the plugin.
 */
const onPlayerReady = (player, options) => {
  player.addClass('vjs-mobile-ui');

  if (options.touchControls.disableOnEnd || typeof player.endscreen === 'function') {
    player.addClass('vjs-mobile-ui-disable-end');
  }

  if (options.fullscreen.iOS &&
      videojs.browser.IS_IOS && videojs.browser.IOS_VERSION > 9 &&
      !player.el_.ownerDocument.querySelector('.bc-iframe')) {
    player.tech_.el_.setAttribute('playsinline', 'playsinline');
    player.tech_.supportsFullScreen = function() {
      return false;
    };
  }

  // Insert before the control bar
  let controlBarIdx;
  const versionParts = videojs.VERSION.split('.');
  const major = parseInt(versionParts[0], 10);
  const minor = parseInt(versionParts[1], 10);

  // Video.js < 7.7.0 doesn't account for precedding components that don't have elements
  if (major < 7 || (major === 7 && minor < 7)) {
    controlBarIdx = Array.prototype.indexOf.call(
      player.el_.children,
      player.getChild('ControlBar').el_
    );
  } else {
    controlBarIdx = player.children_.indexOf(player.getChild('ControlBar'));
  }

  player.addChild('TouchOverlay', options.touchControls, controlBarIdx);

  let locked = false;

  const rotationHandler = () => {
    const currentAngle = angle();

    if ((currentAngle === 90 || currentAngle === 270 || currentAngle === -90) &&
        options.enterOnRotate) {
      if (player.paused() === false) {
        player.requestFullscreen();
        if (options.fullscreen.lockOnRotate &&
            screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').then(() => {
            locked = true;
          }).catch(() => {
            videojs.log('orientation lock not allowed');
          });
        }
      }
    }

    if ((currentAngle === 0 || currentAngle === 180) && options.exitOnRotate) {
      if (player.isFullscreen()) {
        player.exitFullscreen();
      }
    }
  };

  
  window.addEventListener('orientationchange', rotationHandler);

  player.on('ended', _ => {
    if (locked === true) {
      screen.orientation.unlock();
      locked = false;
    }
  });
};

/**
 * A video.js plugin.
 *
 * Adds a monile UI for player control, and fullscreen orientation control
 *
 * @function mobileUi
 * @param    {Object} [options={}]
 *           Plugin options.
 * @param    {boolean} [options.forceForTesting=false]
 *           Enables the display regardless of user agent, for testing purposes
 * @param    {Object} [options.fullscreen={}]
 *           Fullscreen options.
 * @param    {boolean} [options.fullscreen.enterOnRotate=true]
 *           Whether to go fullscreen when rotating to landscape
 * @param    {boolean} [options.fullscreen.exitOnRotate=true]
 *           Whether to leave fullscreen when rotating to portrait (if not locked)
 * @param    {boolean} [options.fullscreen.lockOnRotate=true]
 *           Whether to lock orientation when rotating to landscape
 *           Unlocked when exiting fullscreen or on 'ended'
 * @param    {boolean} [options.fullscreen.iOS=false]
 *           Whether to disable iOS's native fullscreen so controls can work
 * @param    {Object} [options.touchControls={}]
 *           Touch UI options.
 * @param    {int} [options.touchControls.seekSeconds=10]
 *           Number of seconds to seek on double-tap
 * @param    {int} [options.touchControls.tapTimeout=300]
 *           Interval in ms to be considered a doubletap
 * @param    {boolean} [options.touchControls.disableOnEnd=false]
 *           Whether to disable when the video ends (e.g., if there is an endscreen)
 *           Never shows if the endscreen plugin is present
 */
const mobileUi = function(options = {}) {
  if (options.forceForTesting || videojs.browser.IS_ANDROID || videojs.browser.IS_IOS) {
    this.ready(() => {
      onPlayerReady(this, videojs.mergeOptions(defaults, options));
    });
  }
};

// Register the plugin with video.js.
registerPlugin('mobileUi', mobileUi);

// Include the version number.
mobileUi.VERSION = VERSION;

export default mobileUi;
