import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import _, { isEqual } from 'lodash';
import { MessageRenderingProps } from '../../../../models/messageType';
import { PubKey } from '../../../../session/types';
import { openConversationToSpecificMessage } from '../../../../state/ducks/conversations';
import {
  getMessageQuoteProps,
  isMessageDetailView,
  isMessageSelectionMode,
} from '../../../../state/selectors/conversations';
import { Quote } from './Quote';
import { ToastUtils } from '../../../../session/utils';
import { getMessageBySenderAndTimestamp, getMessagesBySentAt } from '../../../../data/data';
import { MessageModel } from '../../../../models/message';
import { getConversationController } from '../../../../session/conversations';

// tslint:disable: use-simple-attributes

type Props = {
  id: string;
  messageId: string;
};

export type MessageQuoteSelectorProps = Pick<MessageRenderingProps, 'quote' | 'direction'>;

export const fetchQuotedMessage = async (author: string, timestamp: string) => {
  const message: MessageModel | null = await getMessageBySenderAndTimestamp({
    source: author,
    timestamp: Number(timestamp),
  });

  if (!message || message.get('isDeleted')) {
    return null;
  }

  const conversationModel = getConversationController().getOrThrow(message.get('conversationId'));
  const attachments = await conversationModel.getQuoteAttachment(
    message.get('attachments'),
    message.get('preview')
  );

  const contact = message.findAndFormatContact(author);
  const authorName = contact?.profileName || contact?.name || '';

  return {
    text: message.get('body'),
    attachments,
    authorName,
  };
};

export const MessageQuote = (props: Props) => {
  const selected = useSelector(state => getMessageQuoteProps(state as any, props.messageId));
  const multiSelectMode = useSelector(isMessageSelectionMode);
  const isMessageDetailViewMode = useSelector(isMessageDetailView);

  const quote = selected ? selected.quote : undefined;
  const direction = selected ? selected.direction : undefined;

  const [quoteAttachment, setQuoteAttachment] = useState(undefined);
  const [quoteText, setQuoteText] = useState('');
  const [quoteNotFound, setQuoteNotFound] = useState(quote?.referencedMessageNotFound || false);

  const onQuoteClick = useCallback(
    async (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (!quote) {
        window.log.warn('onQuoteClick: quote not valid');
        return;
      }

      if (isMessageDetailViewMode) {
        // trying to scroll while in the container while the message detail view is shown has unknown effects
        return;
      }

      const { messageId: quotedMessageSentAt, sender: quoteAuthor } = quote;
      // For simplicity's sake, we show the 'not found' toast no matter what if we were
      // not able to find the referenced message when the quote was received.
      if (quoteNotFound || !quotedMessageSentAt || !quoteAuthor) {
        ToastUtils.pushOriginalNotFound();
        return;
      }

      const collection = await getMessagesBySentAt(_.toNumber(quotedMessageSentAt));
      const foundInDb = collection.find((item: MessageModel) => {
        const messageAuthor = item.getSource();

        return Boolean(messageAuthor && quoteAuthor === messageAuthor);
      });

      if (!foundInDb) {
        ToastUtils.pushOriginalNotFound();
        return;
      }
      void openConversationToSpecificMessage({
        conversationKey: foundInDb.get('conversationId'),
        messageIdToNavigateTo: foundInDb.get('id'),
        shouldHighlightMessage: true,
      });
    },
    [quote, multiSelectMode, props.messageId]
  );

  if (!selected) {
    return null;
  }

  if (!quote || !quote.sender || !quote.messageId) {
    return null;
  }

  useEffect(() => {
    let isCancelled = false;

    if (quote.sender && quote.messageId) {
      fetchQuotedMessage(quote.sender, quote.messageId || '')
        .then(async result => {
          if (isCancelled) {
            return;
          }

          if (result) {
            if (quoteNotFound) {
              setQuoteNotFound(false);
            }
            if (result.attachments && result.attachments[0]) {
              if (!isEqual(quoteAttachment, result.attachments[0])) {
                setQuoteAttachment(result.attachments[0]);
              }
            }

            if (result.text && !isEqual(quoteText, result.text)) {
              setQuoteText(result.text);
            }
          } else {
            if (!quoteNotFound) {
              setQuoteNotFound(true);
            }
            if (quoteText !== window.i18n('originalMessageNotFound')) {
              setQuoteText(window.i18n('originalMessageNotFound'));
            }
            if (quoteAttachment) {
              setQuoteAttachment(undefined);
            }
          }
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [
    quote.messageId,
    quote.sender,
    fetchQuotedMessage,
    quoteAttachment,
    quoteNotFound,
    quoteText,
  ]);

  const shortenedPubkey = PubKey.shorten(quote.sender);

  const displayedPubkey = quote.authorProfileName ? shortenedPubkey : quote.sender;

  return (
    <Quote
      id={props.id}
      onClick={onQuoteClick}
      text={quoteText}
      attachment={quoteAttachment}
      isIncoming={direction === 'incoming'}
      sender={displayedPubkey}
      authorProfileName={quote.authorProfileName}
      authorName={quote.authorName}
      isFromMe={quote.isFromMe || false}
    />
  );
};
