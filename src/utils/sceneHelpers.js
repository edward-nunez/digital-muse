export function goToScene(currentScene, targetKey, opts = {}) {
  // opts: { fade: boolean, fadeDuration: ms, loadingDuration: ms }
  const fade = opts.fade ?? true;
  const fadeDuration = opts.fadeDuration ?? 400;
  const loadingDuration = opts.loadingDuration ?? 300;

  // Find all currently playing sounds in the scene's sound manager
  const playing = (currentScene.sound && currentScene.sound.sounds)
    ? currentScene.sound.sounds.filter(s => s && s.isPlaying)
    : [];

  // Helper to start transition after audio fade completes
  const startTransition = () => {
    // Launch loading screen
    currentScene.scene.launch('LoadingScreen');

    // Start target scene after a short delay to show loading screen and let animations init
    currentScene.time.delayedCall(loadingDuration, () => {
      currentScene.scene.start(targetKey);
      currentScene.scene.stop('LoadingScreen');
    });
  };

  if (playing.length === 0) {
    // No audio to fade, go straight to loading screen and transition
    startTransition();
    return;
  }

  if (!fade) {
    // Stop all immediately and transition
    try {
      playing.forEach(s => { try { s.stop(); } catch (e) {} });
    } catch (e) {}
    startTransition();
    return;
  }

  // Fade out each playing sound, then transition when all done
  const originals = playing.map(s => ({ sound: s, vol: (typeof s.volume === 'number') ? s.volume : 1 }));
  let completed = 0;
  const total = originals.length;

  originals.forEach(({ sound, vol }) => {
    try {
      currentScene.tweens.addCounter({
        from: vol,
        to: 0,
        duration: fadeDuration,
        onUpdate: (tween) => {
          const v = tween.getValue();
          try { sound.setVolume(v); } catch (e) {}
        },
        onComplete: () => {
          try { sound.stop(); sound.setVolume(vol); } catch (e) {}
          completed += 1;
          if (completed >= total) {
            startTransition();
          }
        }
      });
    } catch (e) {
      try { sound.stop(); } catch (err) {}
      completed += 1;
      if (completed >= total) {
        startTransition();
      }
    }
  });
}

