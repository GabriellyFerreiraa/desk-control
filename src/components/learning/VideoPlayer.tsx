import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LEARNING_BUCKET } from '@/lib/learningFiles';
import { useT } from '@/i18n/lang';

const SIGNED_URL_SECONDS = 3 * 60 * 60;
// Normal playback advances ~0.25s per timeupdate (less than 1s even at 2x);
// a bigger jump means the viewer skipped ahead.
const MAX_PLAYBACK_STEP = 2;
const REPORT_EVERY = 10;
const DONE_AT = 90;

interface VideoPlayerProps {
  storagePath: string;
  initialPercent: number;
  onProgress: (percent: number) => void;
}

// Counts the seconds actually played in this session, so seeking to the
// end doesn't count as watching. The server keeps the highest percentage
// ever reported, so a second session only adds on top if it goes further.
export const VideoPlayer = ({ storagePath, initialPercent, onProgress }: VideoPlayerProps) => {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedSeconds = useRef(new Set<number>());
  const lastTime = useRef<number | null>(null);
  const reported = useRef(initialPercent);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [percent, setPercent] = useState(initialPercent);

  useEffect(() => {
    let cancelled = false;
    supabase.storage.from(LEARNING_BUCKET).createSignedUrl(storagePath, SIGNED_URL_SECONDS).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) setFailed(true);
      else setSrc(data.signedUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const currentPercent = () => {
    const duration = videoRef.current?.duration;
    if (!duration || !Number.isFinite(duration)) return 0;
    return Math.min(100, Math.round((watchedSeconds.current.size / Math.max(1, Math.ceil(duration))) * 100));
  };

  const report = (value: number) => {
    if (value <= reported.current) return;
    reported.current = value;
    onProgress(value);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const now = video.currentTime;
    const previous = lastTime.current;
    if (previous !== null && !video.seeking) {
      const step = now - previous;
      if (step > 0 && step < MAX_PLAYBACK_STEP) {
        for (let s = Math.floor(previous); s <= Math.floor(now); s++) watchedSeconds.current.add(s);
      }
    }
    lastTime.current = now;

    const session = currentPercent();
    setPercent((p) => Math.max(p, session));
    if (session >= reported.current + REPORT_EVERY || (session >= DONE_AT && reported.current < DONE_AT)) {
      report(session);
    }
  };

  if (failed) return <p className="text-sm text-destructive">{t.learning.openFailed}</p>;
  if (!src) return <p className="text-sm text-muted-foreground">{t.common.loading}</p>;

  return <div className="space-y-2">
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        preload="metadata"
        className="w-full rounded-md bg-black max-h-[60vh]"
        onTimeUpdate={handleTimeUpdate}
        onSeeked={() => {
          lastTime.current = videoRef.current?.currentTime ?? null;
        }}
        onPause={() => report(currentPercent())}
        onEnded={() => report(currentPercent())}
      />
      <p className="text-xs text-muted-foreground">
        {t.learning.watched(percent)} · {t.learning.videoHint}
      </p>
    </div>;
};
