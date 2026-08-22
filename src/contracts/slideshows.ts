export type SlideshowAspectRatio = '4:5' | '9:16' | '3:4' | '1:1';
export type SlideshowTransitionStyle = 'hard' | 'fade' | 'slide';
export type SlideshowVideoTransition = 'cut' | 'fade';
export type SlideshowTextStyle =
  | 'outline'
  | 'solid'
  | 'shadow'
  | 'neon'
  | 'tiktok'
  | 'white'
  | 'black'
  | 'yellow'
  | 'pink'
  | 'whiteBubble'
  | 'blackBubble';

export interface SlideshowTextSize {
  width: number;
  height: number;
}

export interface SlideshowTextItem {
  id: string;
  text: string;
  fontSize: string;
  textSize: SlideshowTextSize;
  textStyle: SlideshowTextStyle;
  textPosition: 'top' | 'middle' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  textType?: 'title' | 'body';
  fontWeight?: 500 | 700;
  textTransform?: 'uppercase' | 'none';
}

export interface SlideshowSlideInput {
  id?: string;
  imageUrl: string;
  avatarId?: string;
  compositedImageUrl?: string;
  order: number;
  aspectRatio?: SlideshowAspectRatio;
  timeLengthMs?: number;
  textItems?: SlideshowTextItem[];
  imageOpacity?: number;
}

export interface SlideshowRevision {
  id: string;
  instruction: string;
  summary: string;
  createdAt: string;
  slides: SlideshowSlideInput[];
}

export interface SlideshowMusicSettings {
  source: 'template' | 'upload';
  audioUrl: string;
  name?: string;
  coverUrl?: string;
}

export interface SlideshowSettings {
  duration?: number;
  backgroundColor?: string;
  transitionStyle?: SlideshowTransitionStyle;
  videoTransition?: SlideshowVideoTransition;
  aspectRatio?: SlideshowAspectRatio;
  music?: SlideshowMusicSettings | null;
  revisionHistory?: SlideshowRevision[];
  activeRevisionId?: string | null;
}

export interface SlideshowSlide {
  id: string;
  avatarId: string | null;
  imageUrl: string;
  compositedImageUrl: string | null;
  order: number;
  aspectRatio: SlideshowAspectRatio;
  timeLengthMs: number;
  imageOpacity: number;
  textItems: SlideshowTextItem[];
}

export interface SlideshowVideoArtifact {
  id: string;
  title: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  sourceType: 'UGC_COMPOSITION' | 'SLIDESHOW' | 'GENERATED_HOOK' | 'AI_CLONE';
  sourceSlideshowId: string | null;
  createdAt: string;
}

export interface SlideshowRecord {
  id: string;
  title: string;
  prompt: string | null;
  slideshowType: 'EDUCATIONAL' | 'PROMOTIONAL' | 'STORYTELLING' | 'LIFESTYLE' | 'REVIEW' | null;
  status: 'DRAFT' | 'EXPORTED';
  settings: SlideshowSettings;
  slides: SlideshowSlide[];
  latestVideo: SlideshowVideoArtifact | null;
  videoExportReady: boolean;
  exportHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlideshowListResult {
  slideshows: SlideshowRecord[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SlideshowResult {
  slideshow: SlideshowRecord;
}
