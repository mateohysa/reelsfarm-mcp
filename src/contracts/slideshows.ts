export type SlideshowAspectRatio = '4:5' | '9:16' | '3:4' | '1:1';
/**
 * Dashboard effort preset for slideshow text. Higher effort uses more visual references
 * (0, 2, 5, 10, or 20) and more model time. extra_high also reviews the rendered text layout.
 */
export type SlideshowEffort = 'light' | 'low' | 'medium' | 'high' | 'extra_high';
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

/** The 24 fonts of TikTok's iOS text editor. */
export type SlideshowTextFont =
  | 'classic' | 'elegance' | 'retro' | 'vintage' | 'typewriter' | 'comic' | 'bold' | 'serif'
  | 'neon' | 'handwriting' | 'freehand' | 'heavy' | 'luxury' | 'arcade' | 'curiouscat' | 'oblique'
  | 'serene' | 'telegraph' | 'paintstroke' | 'slab' | 'phantom' | 'postcard' | 'script' | 'technic';
/** TikTok's text modes: plain, outline, a solid box, or a see-through box. */
export type SlideshowTextEffect = 'none' | 'outline' | 'background' | 'translucent';

/** A TikTok text look: font, mode and colour. These win over textStyle when set. */
export interface SlideshowTextAppearance {
  textFont?: SlideshowTextFont;
  textEffect?: SlideshowTextEffect;
  /** Lowercase hex colour, such as #ffffff. */
  textColor?: string;
}

/** A proven slideshow format the copy follows; it sets the slide count and slideshow type. */
export type SlideshowProvenFormatId = 'help-me-choose' | 'numbered-product-last' | 'rated-picks' | 'problem-math-steps';

/** The Look of a new slideshow. auto picks a designed look only when the prompt asks for one. */
export type SlideDesignChoice = 'auto' | 'classic' | 'tweet' | 'imessage' | 'notebook' | 'magazine';

/** The six reactions Messages offers; a tapback is never any other emoji. */
export type SlideDesignTapback = 'heart' | 'like' | 'dislike' | 'haha' | 'emphasis' | 'question';

/** A post on X: a white card over the slide photo, blurred. */
export interface TweetSlideDesign {
  design: 'tweet';
  /** Fixes the hand-drawn parts so every export draws the same slide. Keep the value a slide already has. */
  seed?: number;
  name: string;
  handle: string;
  text: string;
  /** Such as 9:41 PM · Oct 21, 2026. */
  time: string;
  views: string;
  replies: string;
  reposts: string;
  likes: string;
  saves: string;
  verified?: boolean;
  /** A reply card under the post. */
  reply?: { name: string; handle: string; text: string };
}

/** A screenshot of a Messages chat. It draws no photo, so its slides need no imageUrl. */
export interface MessageSlideDesign {
  design: 'imessage';
  seed?: number;
  contact: string;
  theme?: 'dark' | 'light';
  /** The conversation so far, oldest first. One chat runs through an iMessage slideshow. */
  messages: Array<{
    from: 'them' | 'me';
    text: string;
    reaction?: SlideDesignTapback;
    /** A time line above this message, such as Today 9:41 PM. */
    time?: string;
  }>;
  /** Under the last blue bubble, such as Delivered or Read 9:42 PM. */
  status?: string;
  /** A reply being typed. It opens the keyboard. */
  draft?: string;
  suggestions?: string[];
  clock?: string;
  unread?: string;
}

/** A torn page of grid paper over the slide photo. */
export interface NotebookSlideDesign {
  design: 'notebook';
  seed?: number;
  title: string;
  accent: string;
  points: string[];
  circled?: string;
}

/** A magazine cover over the slide photo, for the first slide. */
export interface MagazineSlideDesign {
  design: 'magazine';
  seed?: number;
  masthead: string;
  issue: string;
  coverLines: Array<{ big: string; small: string }>;
  headline: string;
  headlineSub?: string;
}

/** A designed look drawn instead of the slide photo's text items. */
export type SlideDesign = TweetSlideDesign | MessageSlideDesign | NotebookSlideDesign | MagazineSlideDesign;

export interface SlideshowTextSize {
  width: number;
  height: number;
}

/** Where a text sits when it is placed freely: its centre, as a fraction of the slide (0 to 1). */
export interface SlideshowTextPlacement {
  textX?: number;
  textY?: number;
  /** The line width in em the text wraps at, from 4 to 40. */
  lineWidthEm?: number;
}

export interface SlideshowTextItem extends SlideshowTextAppearance, SlideshowTextPlacement {
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
  /** The slide photo, an owned ReelsFarm asset URL. Required, except on an iMessage slide, which draws none. */
  imageUrl?: string;
  avatarId?: string;
  compositedImageUrl?: string;
  order: number;
  aspectRatio?: SlideshowAspectRatio;
  timeLengthMs?: number;
  textItems?: SlideshowTextItem[];
  imageOpacity?: number;
  /** A designed look drawn instead of the text items; null makes the slide classic. Omit it to keep the saved one. */
  design?: SlideDesign | null;
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
  /** Left out of list results; `get` returns it. An update whose settings leave it out keeps the saved history. */
  revisionHistory?: SlideshowRevision[];
  activeRevisionId?: string | null;
}

export interface SlideshowSlide {
  id: string;
  avatarId: string | null;
  /** Empty on an iMessage slide, which has no photo. */
  imageUrl: string;
  compositedImageUrl: string | null;
  order: number;
  aspectRatio: SlideshowAspectRatio;
  timeLengthMs: number;
  imageOpacity: number;
  textItems: SlideshowTextItem[];
  /** The slide's designed look, or null for a classic slide. */
  design: SlideDesign | null;
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
