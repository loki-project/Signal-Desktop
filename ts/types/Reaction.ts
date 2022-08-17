import { EmojiSet } from 'emoji-mart';

export class RecentReactions {
  public items: Array<string> = [];
  public limit: number = 6;

  constructor(items: Array<string>) {
    this.items = items;
  }

  public size(): number {
    return this.items.length;
  }

  public push(item: string): void {
    if (this.size() === this.limit) {
      this.items.pop();
    }
    this.items.unshift(item);
  }

  public pop(): string | undefined {
    return this.items.pop();
  }

  public swap(index: number): void {
    const temp = this.items.splice(index, 1);
    this.push(temp[0]);
  }
}

type BaseEmojiSkin = { unified: string; native: string };

export interface FixedBaseEmoji {
  id: string;
  name: string;
  keywords: Array<string>;
  skins: Array<BaseEmojiSkin>;
  version: number;
  search?: string;
  // props from emoji panel click event
  native?: string;
  aliases?: Array<string>;
  shortcodes?: string;
  unified?: string;
}

export interface NativeEmojiData {
  categories: Array<{ id: string; emojis: Array<string> }>;
  emojis: Record<string, FixedBaseEmoji>;
  aliases: Record<string, string>;
  sheet: { cols: number; rows: number };
  ariaLabels?: Record<string, string>;
}

// Types for EmojiMart 5 are currently broken these are a temporary fixes
export interface FixedPickerProps {
  autoFocus?: boolean | undefined;
  title?: string | undefined;
  theme?: 'auto' | 'light' | 'dark' | undefined;
  perLine?: number | undefined;
  stickySearch?: boolean | undefined;
  searchPosition?: 'sticky' | 'static' | 'none' | undefined;
  emojiButtonSize?: number | undefined;
  emojiButtonRadius?: number | undefined;
  emojiButtonColors?: string | undefined;
  maxFrequentRows?: number | undefined;
  icons?: 'auto' | 'outline' | 'solid';
  set?: EmojiSet | undefined;
  emoji?: string | undefined;
  navPosition?: 'bottom' | 'top' | 'none' | undefined;
  showPreview?: boolean | undefined;
  previewEmoji?: boolean | undefined;
  noResultsEmoji?: string | undefined;
  previewPosition?: 'bottom' | 'top' | 'none' | undefined;
  skinTonePosition?: 'preview' | 'search' | 'none';
  onEmojiSelect?: (emoji: FixedBaseEmoji) => void;
  onClickOutside?: () => void;
  onKeyDown?: (event: any) => void;
  onAddCustomEmoji?: () => void;
  getImageURL?: () => void;
  getSpritesheetURL?: () => void;
  // Below here I'm currently unsure of usage
  // i18n?: PartialI18n | undefined;
  // style?: React.CSSProperties | undefined;
  // color?: string | undefined;
  // skin?: EmojiSkin | undefined;
  // defaultSkin?: EmojiSkin | undefined;
  // backgroundImageFn?: BackgroundImageFn | undefined;
  // sheetSize?: EmojiSheetSize | undefined;
  // emojisToShowFilter?(emoji: EmojiData): boolean;
  // showSkinTones?: boolean | undefined;
  // emojiTooltip?: boolean | undefined;
  // include?: CategoryName[] | undefined;
  // exclude?: CategoryName[] | undefined;
  // recent?: string[] | undefined;
  // /** NOTE: custom emoji are copied into a singleton object on every new mount */
  // custom?: CustomEmoji[] | undefined;
  // skinEmoji?: string | undefined;
  // notFound?(): React.Component;
  // notFoundEmoji?: string | undefined;
  // enableFrequentEmojiSort?: boolean | undefined;
  // useButton?: boolean | undefined;
}

enum Action {
  REACT = 0,
  REMOVE = 1,
}

export interface Reaction {
  // this is in fact a uint64 so we will have an issue
  id: number; // original message timestamp
  author: string;
  emoji: string;
  action: Action;
}

export type ReactionList = Record<
  string,
  {
    count: number;
    senders: Record<string, string>; // <sender pubkey, messageHash or serverId>
  }
>;

export interface OpenGroupReaction {
  index: number;
  count: number;
  first: number;
  reactors: Array<string>;
  you: boolean;
}

export type OpenGroupReactionList = Record<string, OpenGroupReaction>;

export interface OpenGroupReactionResponse {
  added?: boolean;
  removed?: boolean;
}