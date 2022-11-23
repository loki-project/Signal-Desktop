import _, { compact, flatten, isEqual } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useInterval } from 'react-use';
import styled from 'styled-components';
import { Data } from '../../../../data/data';
import { deleteAllMediaByConvoIdWithConfirmation } from '../../../../interactions/conversationInteractions';
import { Constants } from '../../../../session';
import { useRightOverlayMode } from '../../../../state/selectors/section';
import {
  useSelectedConversationKey,
  useSelectedIsClosedGroupV3,
} from '../../../../state/selectors/selectedConversation';
import { AttachmentTypeWithPath } from '../../../../types/Attachment';
import { getAbsoluteAttachmentPath } from '../../../../types/MessageAttachment';
import { Flex } from '../../../basic/Flex';
import { SpacerLG } from '../../../basic/Text';
import { MediaItemType } from '../../../lightbox/LightboxGallery';
import { MediaGallery } from '../../media-gallery/MediaGallery';
import { StyledScrollContainer } from '../RightPanel';
import { RightOverlayHeader } from './RightOverlayHeader';

const StyledContainer = styled(Flex)`
  width: 100%;
`;

export const OverlayAllMedia = () => {
  const [documents, setDocuments] = useState<Array<MediaItemType>>([]);
  const [media, setMedia] = useState<Array<MediaItemType>>([]);
  const rightOverlay = useRightOverlayMode();
  const selectedConversationKey = useSelectedConversationKey();
  const canClearAll = useSelectedIsClosedGroupV3();

  useEffect(() => {
    let isRunning = true;

    if (selectedConversationKey) {
      void getMediaGalleryProps(selectedConversationKey).then(results => {
        if (isRunning) {
          if (!isEqual(documents, results.documents)) {
            setDocuments(results.documents);
          }

          if (!isEqual(media, results.media)) {
            setMedia(results.media);
          }
        }
      });
    }

    return () => {
      isRunning = false;
      return;
    };
  }, []);

  useInterval(async () => {
    if (selectedConversationKey) {
      const results = await getMediaGalleryProps(selectedConversationKey);
      if (results.documents.length !== documents.length || results.media.length !== media.length) {
        setDocuments(results.documents);
        setMedia(results.media);
      }
    }
  }, 10000);

  if (!rightOverlay || rightOverlay.type !== 'show_media' || !selectedConversationKey) {
    return null;
  }

  const onButtonClicked = () => {
    deleteAllMediaByConvoIdWithConfirmation(selectedConversationKey);
  };

  return (
    <StyledScrollContainer>
      <StyledContainer container={true} flexDirection={'column'} alignItems={'center'}>
        <RightOverlayHeader
          title={window.i18n('allMedia')}
          hideBackButton={false}
          rightButtonText={canClearAll ? window.i18n('clearAll') : undefined}
          onButtonClicked={canClearAll ? onButtonClicked : undefined}
        />
        <MediaGallery documents={documents} media={media} />
        <SpacerLG />
      </StyledContainer>
    </StyledScrollContainer>
  );
};

async function getMediaGalleryProps(
  conversationId: string
): Promise<{
  documents: Array<MediaItemType>;
  media: Array<MediaItemType>;
}> {
  // We fetch more documents than media as they don’t require to be loaded
  // into memory right away. Revisit this once we have infinite scrolling:
  const rawMedia = await Data.getMessagesWithVisualMediaAttachments(
    conversationId,
    Constants.CONVERSATION.DEFAULT_MEDIA_FETCH_COUNT
  );
  const rawDocuments = await Data.getMessagesWithFileAttachments(
    conversationId,
    Constants.CONVERSATION.DEFAULT_DOCUMENTS_FETCH_COUNT
  );

  const media = flatten(
    rawMedia.map(attributes => {
      const { attachments, source, id, timestamp, serverTimestamp, received_at } = attributes;

      return (attachments || [])
        .filter(
          (attachment: AttachmentTypeWithPath) =>
            attachment.thumbnail && !attachment.pending && !attachment.error
        )
        .map((attachment: AttachmentTypeWithPath, index: number) => {
          const { thumbnail } = attachment;

          const mediaItem: MediaItemType = {
            objectURL: getAbsoluteAttachmentPath(attachment.path),
            thumbnailObjectUrl: thumbnail ? getAbsoluteAttachmentPath(thumbnail.path) : undefined,
            contentType: attachment.contentType || '',
            index,
            messageTimestamp: timestamp || serverTimestamp || received_at || 0,
            messageSender: source,
            messageId: id,
            attachment,
          };

          return mediaItem;
        });
    })
  );

  // Unlike visual media, only one non-image attachment is supported
  const documents = rawDocuments.map(attributes => {
    // this is to not fail if the attachment is invalid (could be a Long Attachment type which is not supported)
    if (!attributes.attachments?.length) {
      // window?.log?.info(
      //   'Got a message with an empty list of attachment. Skipping...'
      // );
      return null;
    }
    const attachment = attributes.attachments[0];
    const { source, id, timestamp, serverTimestamp, received_at } = attributes;

    return {
      contentType: attachment.contentType,
      index: 0,
      attachment,
      messageTimestamp: timestamp || serverTimestamp || received_at || 0,
      messageSender: source,
      messageId: id,
    };
  });

  return {
    media,
    documents: compact(documents), // remove null
  };
}
