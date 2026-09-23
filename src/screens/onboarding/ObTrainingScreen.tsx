import React, {useMemo, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, View} from 'react-native';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import {ObStepLayout} from './ObStepLayout';
import {AppText} from '../../components/common/AppText';
import {Checkbox} from '../../components/inputs/Checkbox';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {obKitCount} from '../../store/selectors';
import {profileApi} from '../../services/api';
import {
  KIT_LIST,
  TRAINING_REQUIRED_SECONDS,
  TRAINING_VIDEO_TITLE,
} from '../../mock';
import {colors} from '../../theme';
import {mediaBandHeight, useLayout} from '../../theme/layout';

const TRAINING_VIDEO = require('../../assets/videos/istockphoto-1473520848-640_adpp_is.mp4');

function buildLocalVideoHtml(videoUri: string): string {
  const safeUri = videoUri.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; background: #111827; height: 100%; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; background: #111827; }
  </style>
</head>
<body>
  <video id="player" playsinline webkit-playsinline controls preload="auto" src="${safeUri}"></video>
  <script>
    var player = document.getElementById('player');
    var lastPostedSecond = -1;
    var completedPosted = false;
    function post(payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    function report(force) {
      if (!player) return;
      var seconds = Math.floor(player.currentTime || 0);
      if (!force && seconds === lastPostedSecond) return;
      lastPostedSecond = seconds;
      post({ type: 'progress', seconds: seconds });
      if (!completedPosted && seconds >= ${TRAINING_REQUIRED_SECONDS}) {
        completedPosted = true;
        post({ type: 'completed', seconds: seconds });
      }
    }
    player.addEventListener('timeupdate', function () { report(false); });
    player.addEventListener('ended', function () {
      report(true);
      if (!completedPosted) {
        completedPosted = true;
        post({ type: 'completed', seconds: Math.floor(player.currentTime || 0) });
      }
    });
    player.addEventListener('error', function () {
      post({ type: 'error' });
    });
  </script>
</body>
</html>`;
}

export function ObTrainingScreen() {
  const nav = useAppNavigation();
  const layout = useLayout();
  const {state, actions} = useRider();
  const kit = obKitCount(state);
  const ready = state.obVideo && kit === KIT_LIST.length;
  const [videoError, setVideoError] = useState('');
  const [continueError, setContinueError] = useState('');
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [syncingComplete, setSyncingComplete] = useState(false);
  const completingRef = useRef(false);
  const videoH = mediaBandHeight(layout.height, 0.32, 180, 280);

  const videoUri = useMemo(() => {
    const resolved = Image.resolveAssetSource(TRAINING_VIDEO);
    return resolved?.uri ?? '';
  }, []);

  const embedHtml = useMemo(
    () => (videoUri ? buildLocalVideoHtml(videoUri) : ''),
    [videoUri],
  );

  const syncTrainingProgress = async (
    progress = 100,
  ): Promise<{ok: boolean; error?: string}> => {
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));
    const listed = await profileApi.listTrainingVideos();
    if (!listed.ok) {
      return {
        ok: false,
        error: listed.error || 'Could not sync training progress',
      };
    }
    const videos = Array.isArray(listed.data) ? listed.data : [];
    if (videos.length === 0) {
      return {ok: true};
    }
    const updates = await Promise.all(
      videos.map(v => profileApi.updateTrainingProgress(v.videoId, clamped)),
    );
    const failed = updates.find(r => !r.ok);
    if (failed) {
      return {
        ok: false,
        error: failed.error || 'Could not sync training progress',
      };
    }
    return {ok: true};
  };

  const markTrainingComplete = async () => {
    if (state.obVideo || completingRef.current) {
      return;
    }
    completingRef.current = true;
    setSyncingComplete(true);
    setVideoError('');
    setWatchedSeconds(TRAINING_REQUIRED_SECONDS);
    const sync = await syncTrainingProgress(100);
    setSyncingComplete(false);
    if (!sync.ok) {
      completingRef.current = false;
      setVideoError(
        sync.error || 'Could not save training progress. Tap Retry.',
      );
      return;
    }
    actions.playVideo();
  };

  const retryTrainingSync = () => {
    setVideoError('');
    void markTrainingComplete();
  };

  const onWebMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        seconds?: number;
      };
      if (data.type === 'completed') {
        void markTrainingComplete();
        return;
      }
      if (
        data.type === 'progress' &&
        typeof data.seconds === 'number' &&
        Number.isFinite(data.seconds)
      ) {
        const seconds = Math.max(0, Math.floor(data.seconds));
        setWatchedSeconds(prev => Math.max(prev, seconds));
        if (seconds >= TRAINING_REQUIRED_SECONDS) {
          void markTrainingComplete();
        } else if (seconds > 0 && seconds % 5 === 0) {
          void syncTrainingProgress(
            Math.round((seconds / TRAINING_REQUIRED_SECONDS) * 100),
          );
        }
        return;
      }
      if (data.type === 'error') {
        setVideoError('Could not play the training video.');
      }
    } catch {
      // ignore malformed messages
    }
  };

  const onContinue = async () => {
    if (!ready || submitting) {
      return;
    }
    setSubmitting(true);
    setContinueError('');
    const sync = await syncTrainingProgress(100);
    if (!sync.ok) {
      setContinueError(
        sync.error || 'Could not save training progress. Try again.',
      );
      setSubmitting(false);
      return;
    }
    if (!state.obVideo) {
      actions.playVideo();
    }
    const items = Object.keys(state.obKit).filter(k => state.obKit[k]);
    const ack = await profileApi.acknowledgeKit(
      items,
      state.obHub ?? undefined,
    );
    if (!ack.ok) {
      setContinueError(ack.error || 'Could not confirm kit. Try again.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    nav.navigate('ObReview');
  };

  const remaining = Math.max(0, TRAINING_REQUIRED_SECONDS - watchedSeconds);

  return (
    <ObStepLayout
      step={5}
      totalSteps={5}
      title="Training & kit"
      subtitle="Watch 30 seconds of training, then confirm your kit"
      onBack={() => nav.goBack()}
      footer={
        <View style={styles.footerCol}>
          {!!continueError && (
            <AppText style={styles.error}>{continueError}</AppText>
          )}
          <PrimaryButton
            label={submitting ? 'Saving…' : 'Review & Submit'}
            onPress={() => void onContinue()}
            disabled={!ready || submitting || syncingComplete}
          />
        </View>
      }>
      <View style={[styles.videoCard, {height: videoH}]}>
        {embedHtml ? (
          <WebView
            source={{html: embedHtml}}
            style={styles.webview}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            allowFileAccess
            allowUniversalAccessFromFileURLs
            onMessage={onWebMessage}
            setSupportMultipleWindows={false}
          />
        ) : (
          <View style={styles.webviewFallback}>
            <AppText style={styles.error}>Training video missing.</AppText>
          </View>
        )}
      </View>
      <View style={styles.captionRow}>
        <AppText style={styles.videoCaption} numberOfLines={2}>
          {TRAINING_VIDEO_TITLE}
        </AppText>
        {state.obVideo ? (
          <AppText style={styles.doneBadge} numberOfLines={1}>
            ✓ Completed
          </AppText>
        ) : syncingComplete ? (
          <AppText style={styles.watchBadge} numberOfLines={1}>
            Saving…
          </AppText>
        ) : (
          <AppText style={styles.watchBadge} numberOfLines={1}>
            {watchedSeconds > 0
              ? `${watchedSeconds}s / ${TRAINING_REQUIRED_SECONDS}s`
              : `Watch ${TRAINING_REQUIRED_SECONDS}s to unlock`}
          </AppText>
        )}
      </View>
      {!!videoError && (
        <Pressable onPress={retryTrainingSync} disabled={syncingComplete}>
          <AppText style={styles.error}>
            {videoError}
            {videoError.includes('Retry') ? '' : ' · Retry'}
          </AppText>
        </Pressable>
      )}
      {!state.obVideo && !videoError && (
        <AppText style={styles.hint}>
          {remaining > 0
            ? `Keep watching — ${remaining}s left to unlock Review & Submit.`
            : syncingComplete
              ? 'Saving training progress…'
              : 'Video complete. Confirm all kit items to continue.'}
        </AppText>
      )}

      <AppText style={styles.kitLabel}>
        Confirm you've received your kit ({kit}/{KIT_LIST.length})
      </AppText>
      <View style={styles.list}>
        {KIT_LIST.map(k => {
          const done = !!state.obKit[k.id];
          return (
            <Pressable
              key={k.id}
              onPress={() => actions.toggleObKit(k.id)}
              style={[
                styles.row,
                {
                  borderColor: done ? 'rgba(35,114,39,.3)' : colors.neutralTile,
                  backgroundColor: done ? colors.primaryTint06 : colors.white,
                },
              ]}>
              <Checkbox
                checked={done}
                onToggle={() => actions.toggleObKit(k.id)}
                boxOnly
              />
              <AppText style={styles.kitIcon}>{k.icon}</AppText>
              <AppText style={styles.kitItemLabel} numberOfLines={2}>
                {k.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </ObStepLayout>
  );
}

const styles = StyleSheet.create({
  videoCard: {
    borderRadius: 16,
    marginTop: 4,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111827',
  },
  webviewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  videoCaption: {
    flex: 1,
    minWidth: 0,
    fontWeight: '700',
    fontSize: 13,
    color: colors.textSecondary,
  },
  doneBadge: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.primary,
    flexShrink: 0,
  },
  watchBadge: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  hint: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 17,
  },
  error: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
  footerCol: {gap: 8},
  kitLabel: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 22,
    marginBottom: 12,
  },
  list: {gap: 10},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  kitIcon: {fontSize: 18},
  kitItemLabel: {
    flex: 1,
    minWidth: 0,
    fontWeight: '600',
    fontSize: 13,
    color: colors.ink,
  },
});
