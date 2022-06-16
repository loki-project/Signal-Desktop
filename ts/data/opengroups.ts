import { isEqual } from 'lodash';
import { ConversationCollection } from '../models/conversation';
import { OpenGroupRequestCommonType } from '../session/apis/open_group_api/opengroupV2/ApiUtil';
import { isOpenGroupV2 } from '../session/apis/open_group_api/utils/OpenGroupUtils';
import { channels } from './channels';

export type OpenGroupV2Room = {
  serverUrl: string;

  /** this is actually shared for all this server's room */
  serverPublicKey: string;
  roomId: string;

  /** a user displayed name */
  roomName?: string;

  /** the url to the group's image */
  imageID?: string;

  /** the linked ConversationModel.id */
  conversationId?: string;
  lastMessageFetchedServerID?: number;
  maxMessageFetchedSeqNo?: number;
  /**
   * This value represents the rowId of the last message deleted. Not the id of the last message ID
   */
  lastMessageDeletedServerID?: number;
  /**
   * This value is set with the current timestamp whenever we get new messages.
   */
  lastFetchTimestamp?: number;

  /**
   * This is shared across all rooms in a server.
   */
  capabilities?: Array<string>;
};

export function getAllV2OpenGroupRooms(): Map<string, OpenGroupV2Room> | undefined {
  throwIfNotLoaded();
  if (!cachedRooms) {
    return undefined;
  }

  const results = new Map<string, OpenGroupV2Room>();

  cachedRooms.forEach(o => {
    if (o.conversationId) {
      results.set(o.conversationId, o);
    }
  });

  return results;
}

// avoid doing fetches and write too often from the db by using a cache on the renderer side.
let cachedRooms: Array<OpenGroupV2Room> | null = null;

export async function opengroupRoomsLoad() {
  if (cachedRooms !== null) {
    return;
  }
  const loadedFromDB = (await channels.getAllV2OpenGroupRooms()) as
    | Array<OpenGroupV2Room>
    | undefined;

  if (loadedFromDB) {
    cachedRooms = new Array();
    loadedFromDB.forEach(r => {
      try {
        cachedRooms?.push(JSON.parse((r as any).json));
      } catch (e) {
        window.log.warn(e.message);
      }
    });
    return;
  }
  cachedRooms = [];
}

function throwIfNotLoaded() {
  if (cachedRooms === null) {
    throw new Error('opengroupRoomsLoad must be called first');
  }
}

export function getV2OpenGroupRoom(conversationId: string): OpenGroupV2Room | undefined {
  throwIfNotLoaded();
  if (!isOpenGroupV2(conversationId)) {
    throw new Error(`getV2OpenGroupRoom: this is not a valid v2 id: ${conversationId}`);
  }

  const found = cachedRooms?.find(m => m.conversationId === conversationId);
  return found || undefined;
}
export function getV2OpenGroupRoomsByServerUrl(
  serverUrl: string
): Array<OpenGroupV2Room> | undefined {
  throwIfNotLoaded();
  const found = cachedRooms?.filter(m => m.serverUrl === serverUrl);

  return found || undefined;
}

export function getV2OpenGroupRoomByRoomId(
  roomInfos: OpenGroupRequestCommonType
): OpenGroupV2Room | undefined {
  throwIfNotLoaded();
  const found = cachedRooms?.find(
    m => m.roomId === roomInfos.roomId && m.serverUrl === roomInfos.serverUrl
  );

  return found || undefined;
}

export async function saveV2OpenGroupRoom(room: OpenGroupV2Room): Promise<void> {
  throwIfNotLoaded();
  if (!room.conversationId || !room.roomId || !room.serverUrl || !room.serverPublicKey) {
    throw new Error('Cannot save v2 room, invalid data');
  }

  const found =
    (room.conversationId && cachedRooms?.find(m => m.conversationId === room.conversationId)) ||
    undefined;

  if (!found) {
    await channels.saveV2OpenGroupRoom(room);
    return;
  }

  // because isEqual is funky with pointer being changed, we have to do this for now
  if (JSON.stringify(room) !== JSON.stringify(found)) {
    await channels.saveV2OpenGroupRoom(room);
    return;
  }
}

export async function removeV2OpenGroupRoom(conversationId: string): Promise<void> {
  throwIfNotLoaded();
  if (cachedRooms?.find(m => m.conversationId === conversationId)) {
    await channels.removeV2OpenGroupRoom(conversationId);
  }
}

export async function getAllOpenGroupV2Conversations(): Promise<ConversationCollection> {
  const conversations = await channels.getAllOpenGroupV2Conversations();

  const collection = new ConversationCollection();
  collection.add(conversations);
  return collection;
}
