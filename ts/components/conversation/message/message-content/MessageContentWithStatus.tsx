import classNames from 'classnames';
import React, { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { replyToMessage } from '../../../../interactions/conversationInteractions';
import { MessageRenderingProps } from '../../../../models/messageType';
import { toggleSelectedMessageId } from '../../../../state/ducks/conversations';
import { updateReactListModal } from '../../../../state/ducks/modalDialog';
import { isMessageSelectionMode } from '../../../../state/selectors/conversations';
import { useMessageContentWithStatusesSelectorProps } from '../../../../state/selectors/messages';
import { useSelectedHasReactions } from '../../../../state/selectors/selectedConversation';
import { Reactions } from '../../../../util/reactions';

import { MessageAuthorText } from './MessageAuthorText';
import { MessageContent } from './MessageContent';
import { MessageContextMenu } from './MessageContextMenu';
import { MessageReactions, StyledMessageReactions } from './MessageReactions';
import { MessageStatus } from './MessageStatus';

export type MessageContentWithStatusSelectorProps = Pick<
  MessageRenderingProps,
  'direction' | 'isDeleted'
>;

type Props = {
  messageId: string;
  ctxMenuID: string;
  isDetailView?: boolean;
  dataTestId?: string;
};
// tslint:disable: use-simple-attributes

const StyledMessageContentContainer = styled.div<{ direction: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: ${props => (props.direction === 'left' ? 'flex-start' : 'flex-end')};
  width: 100%;

  ${StyledMessageReactions} {
    margin-right: var(--margins-sm);
  }
`;

const StyledMessageWithAuthor = styled.div<{ isIncoming: boolean }>`
  max-width: '95%';
`;

export const MessageContentWithStatuses = (props: Props) => {
  const contentProps = useMessageContentWithStatusesSelectorProps(props.messageId);
  const dispatch = useDispatch();
  const hasReactions = useSelectedHasReactions();

  const multiSelectMode = useSelector(isMessageSelectionMode);

  const onClickOnMessageOuterContainer = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (multiSelectMode && messageId && !props?.isDetailView) {
        event.preventDefault();
        event.stopPropagation();
        dispatch(toggleSelectedMessageId(messageId));
      }
    },
    [window.contextMenuShown, props?.messageId, multiSelectMode, props?.isDetailView]
  );

  const onDoubleClickReplyToMessage = (e: React.MouseEvent<HTMLDivElement>) => {
    const currentSelection = window.getSelection();
    const currentSelectionString = currentSelection?.toString() || undefined;

    if ((e.target as any).localName !== 'em-emoji-picker' && !props?.isDetailView) {
      if (
        !currentSelectionString ||
        currentSelectionString.length === 0 ||
        !/\s/.test(currentSelectionString)
      ) {
        // if multiple word are selected, consider that this double click was actually NOT used to reply to
        // but to select
        void replyToMessage(messageId);
        currentSelection?.empty();
        e.preventDefault();
        return;
      }
    }
  };

  const { messageId, ctxMenuID, isDetailView, dataTestId } = props;
  if (!contentProps) {
    return null;
  }
  const { direction, isDeleted } = contentProps;
  const isIncoming = direction === 'incoming';

  const [popupReaction, setPopupReaction] = useState('');

  const handleMessageReaction = async (emoji: string) => {
    await Reactions.sendMessageReaction(messageId, emoji);
  };

  const handlePopupClick = () => {
    dispatch(updateReactListModal({ reaction: popupReaction, messageId }));
  };

  return (
    <StyledMessageContentContainer
      direction={isIncoming ? 'left' : 'right'}
      onMouseLeave={() => {
        setPopupReaction('');
      }}
    >
      <div
        className={classNames('module-message', `module-message--${direction}`)}
        role="button"
        onClick={onClickOnMessageOuterContainer}
        onDoubleClickCapture={onDoubleClickReplyToMessage}
        data-testid={dataTestId}
      >
        {!isDetailView && (
          <MessageStatus
            dataTestId="msg-status-incoming"
            messageId={messageId}
            isCorrectSide={isIncoming}
          />
        )}
        <StyledMessageWithAuthor isIncoming={isIncoming}>
          {!isDetailView && <MessageAuthorText messageId={messageId} />}

          <MessageContent messageId={messageId} isDetailView={isDetailView} />
        </StyledMessageWithAuthor>
        {!isDetailView && (
          <MessageStatus
            dataTestId="msg-status-outgoing"
            messageId={messageId}
            isCorrectSide={!isIncoming}
          />
        )}
        {!isDeleted && !isDetailView && (
          <MessageContextMenu
            messageId={messageId}
            contextMenuId={ctxMenuID}
            enableReactions={hasReactions}
          />
        )}
      </div>
      {hasReactions && !isDetailView && (
        <MessageReactions
          messageId={messageId}
          onClick={handleMessageReaction}
          popupReaction={popupReaction}
          setPopupReaction={setPopupReaction}
          onPopupClick={handlePopupClick}
        />
      )}
    </StyledMessageContentContainer>
  );
};
