import React, { ReactElement, useRef, useState } from 'react';
import { ReactionList } from '../../../../types/Message';
import { UserUtils } from '../../../../session/utils';
import { abbreviateNumber } from '../../../../util/abbreviateNumber';
import { nativeEmojiData } from '../../../../util/emoji';
import styled from 'styled-components';
import { useMouse } from 'react-use';
import { ReactionPopup, TipPosition } from './ReactionPopup';
import { popupXDefault, popupYDefault } from '../message-content/MessageReactions';

const StyledReaction = styled.button<{ selected: boolean; inModal: boolean; showCount: boolean }>`
  display: flex;
  justify-content: ${props => (props.showCount ? 'flex-start' : 'center')};
  align-items: center;

  background-color: var(--color-received-message-background);
  border-width: 1px;
  border-style: solid;
  border-color: ${props => (props.selected ? 'var(--color-accent)' : 'transparent')};
  border-radius: 11px;
  box-sizing: border-box;
  padding: 0 7px;
  height: 23px;
  margin: 0 4px var(--margins-sm);

  span:nth-child(2) {
    font-size: var(--font-size-xs);
    margin-left: 8px;
  }
`;

const StyledReactionContainer = styled.div`
  position: relative;
`;

export type ReactionProps = {
  emoji: string;
  messageId: string;
  reactions: ReactionList;
  inModal: boolean;
  inGroup: boolean;
  handlePopupX: (...args: Array<any>) => void;
  handlePopupY: (...args: Array<any>) => void;
  onClick: (...args: Array<any>) => void;
  popupReaction?: string;
  onSelected?: (...args: Array<any>) => boolean;
  handlePopupReaction?: (...args: Array<any>) => void;
  handlePopupClick?: (...args: Array<any>) => void;
};

export const Reaction = (props: ReactionProps): ReactElement => {
  const {
    emoji,
    messageId,
    reactions,
    inModal,
    inGroup,
    handlePopupX,
    handlePopupY,
    onClick,
    popupReaction,
    onSelected,
    handlePopupReaction,
    handlePopupClick,
  } = props;
  const senders = Object.keys(reactions[emoji]);
  const showCount = senders && (senders.length > 1 || inGroup);

  const reactionRef = useRef<HTMLDivElement>(null);
  const { docX, elW } = useMouse(reactionRef);

  const gutterWidth = 380;
  const tooltipMidPoint = 108; // width is 216px;
  const [tooltipPosition, setTooltipPosition] = useState<TipPosition>('center');

  const me = UserUtils.getOurPubKeyStrFromCache();
  const selected = () => {
    if (onSelected) {
      return onSelected(emoji);
    }
    return senders && senders.length > 0 && senders.includes(me);
  };
  const handleReactionClick = () => {
    onClick(emoji);
  };

  return (
    <StyledReactionContainer ref={reactionRef}>
      <StyledReaction
        showCount={showCount}
        selected={selected()}
        inModal={inModal}
        onClick={() => {
          handleReactionClick();
        }}
        onMouseEnter={() => {
          if (inGroup) {
            const { innerWidth: windowWidth } = window;
            if (handlePopupReaction) {
              // overflow on far right means we shift left
              if (docX + tooltipMidPoint > windowWidth) {
                handlePopupX(Math.abs(popupXDefault) * 1.5 * -1);
                setTooltipPosition('right');
                // overflow onto conversations means we lock to the right
              } else if (docX - elW <= gutterWidth + tooltipMidPoint) {
                const offset = -12.5;
                handlePopupX(offset);
                setTooltipPosition('left');
              } else {
                handlePopupX(popupXDefault);
                setTooltipPosition('center');
              }

              handlePopupReaction(emoji);
            }
          }
        }}
      >
        <span
          role={'img'}
          aria-label={nativeEmojiData?.ariaLabels ? nativeEmojiData.ariaLabels[emoji] : undefined}
        >
          {emoji}
        </span>
        {showCount && <span>{abbreviateNumber(senders.length)}</span>}
      </StyledReaction>
      {inGroup && popupReaction && popupReaction === emoji && (
        <ReactionPopup
          messageId={messageId}
          emoji={popupReaction}
          senders={Object.keys(reactions[popupReaction])}
          tooltipPosition={tooltipPosition}
          onClick={() => {
            if (handlePopupReaction) {
              handlePopupReaction('');
            }
            handlePopupX(popupXDefault);
            handlePopupY(popupYDefault);
            setTooltipPosition('center');
            if (handlePopupClick) {
              handlePopupClick();
            }
          }}
        />
      )}
    </StyledReactionContainer>
  );
};
