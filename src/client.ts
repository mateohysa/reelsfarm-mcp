import type { ToolName } from './generated/index.js';
import type { JsonObject, RawToolResult, ReelsFarmClientOptions } from './types.js';
import { ReelsFarmConnection, resolveOptions } from './transport/connection.js';
import type { DomainContext } from './domains/context.js';
import { AccountDomain } from './domains/account.js';
import { AssetsDomain } from './domains/assets.js';
import { AvatarsDomain } from './domains/avatars.js';
import { CharactersDomain } from './domains/characters.js';
import { ProductScenesDomain } from './domains/product-scenes.js';
import { VideosDomain } from './domains/videos.js';
import { HooksDomain } from './domains/hooks.js';
import { AiClonesDomain } from './domains/ai-clones.js';
import { SlideshowsDomain } from './domains/slideshows.js';
import { PostsDomain } from './domains/posts.js';
import { AutomationsDomain } from './domains/automations.js';
import { SocialDomain } from './domains/social.js';
import { PromptsDomain } from './domains/prompts.js';
import { MusicDomain } from './domains/music.js';
import { DraftsDomain } from './domains/drafts.js';
import { TrashDomain } from './domains/trash.js';
import { EventsDomain } from './domains/events.js';
import { ValidateDomain } from './domains/validate.js';
import { ProductContextsDomain } from './domains/product-contexts.js';
import { OperationsDomain } from './domains/operations.js';
import { ImageGenerationsDomain } from './domains/image-generations.js';
import { MediaCollectionsDomain } from './domains/media-collections.js';
import { CommunityDomain } from './domains/community.js';

export class ReelsFarmClient {
  private readonly connection: ReelsFarmConnection;
  private readonly context: DomainContext;
  readonly raw: {
    listTools: () => Promise<JsonObject[]>;
    callTool: <T extends JsonObject = JsonObject>(name: ToolName | string, args?: JsonObject) => Promise<RawToolResult<T>>;
  };

  readonly account: AccountDomain;
  readonly assets: AssetsDomain;
  readonly avatars: AvatarsDomain;
  readonly characters: CharactersDomain;
  readonly productScenes: ProductScenesDomain;
  readonly videos: VideosDomain;
  readonly hooks: HooksDomain;
  readonly aiClones: AiClonesDomain;
  readonly slideshows: SlideshowsDomain;
  readonly posts: PostsDomain;
  readonly automations: AutomationsDomain;
  readonly social: SocialDomain;
  readonly prompts: PromptsDomain;
  readonly music: MusicDomain;
  readonly drafts: DraftsDomain;
  readonly trash: TrashDomain;
  readonly events: EventsDomain;
  readonly validate: ValidateDomain;
  readonly productContexts: ProductContextsDomain;
  readonly operations: OperationsDomain;
  readonly imageGenerations: ImageGenerationsDomain;
  readonly mediaCollections: MediaCollectionsDomain;
  readonly community: CommunityDomain;

  constructor(options: ReelsFarmClientOptions = {}) {
    const resolved = resolveOptions(options);
    this.connection = new ReelsFarmConnection(resolved);
    this.context = {
      dryRun: Boolean(resolved.dryRun),
      autoConfirm: Boolean(resolved.autoConfirm),
      callTool: (name, args = {}) => this.connection.callTool(name, args),
    };
    this.raw = {
      listTools: () => this.connection.listTools(),
      callTool: (name, args = {}) => this.connection.callTool(name, args),
    };

    this.account = new AccountDomain(this.context);
    this.assets = new AssetsDomain(this.context);
    this.avatars = new AvatarsDomain(this.context);
    this.characters = new CharactersDomain(this.context);
    this.productScenes = new ProductScenesDomain(this.context);
    this.videos = new VideosDomain(this.context);
    this.hooks = new HooksDomain(this.context);
    this.aiClones = new AiClonesDomain(this.context);
    this.slideshows = new SlideshowsDomain(this.context);
    this.posts = new PostsDomain(this.context);
    this.automations = new AutomationsDomain(this.context);
    this.social = new SocialDomain(this.context);
    this.prompts = new PromptsDomain(this.context);
    this.music = new MusicDomain(this.context);
    this.drafts = new DraftsDomain(this.context);
    this.trash = new TrashDomain(this.context);
    this.events = new EventsDomain(this.context);
    this.validate = new ValidateDomain(this.context);
    this.productContexts = new ProductContextsDomain(this.context);
    this.operations = new OperationsDomain(this.context);
    this.imageGenerations = new ImageGenerationsDomain(this.context);
    this.mediaCollections = new MediaCollectionsDomain(this.context);
    this.community = new CommunityDomain(this.context);

  }

  /** Establish the MCP connection and finish configured tool-surface validation. */
  ready(): Promise<void> {
    return this.connection.ready();
  }

  completeOAuthCallback(callbackUrl: string | URL): Promise<void> {
    return this.connection.completeOAuthCallback(callbackUrl);
  }

  close(): Promise<void> {
    return this.connection.close();
  }
}
