import React from 'react';

import { ToastUtils, UserUtils } from '../../session/utils';

import _ from 'lodash';
import { SpacerLG, Text } from '../basic/Text';
import { updateGroupMembersModal } from '../../state/ducks/modalDialog';
import { SessionButton, SessionButtonColor } from '../basic/SessionButton';
import { MemberListItem } from '../MemberListItem';
import { SessionWrapperModal } from '../SessionWrapperModal';
import { useDispatch } from 'react-redux';
import { useConversationPropsById } from '../../hooks/useParamSelector';
// tslint:disable-next-line: no-submodule-imports
import useKey from 'react-use/lib/useKey';
import { useWeAreAdmin } from '../../hooks/useWeAreAdmin';
import { useSet } from '../../hooks/useSet';
import { ClosedGroup } from '../../session';
import { getConversationController } from '../../session/conversations';

type Props = {
  conversationId: string;
};

const ClassicMemberList = (props: {
  convoId: string;
  selectedMembers: Array<string>;
  showAdmins?: boolean; // if true, admins of this convo will be put at the top of the list and greyed
  onSelect: (m: string) => void;
  onUnselect: (m: string) => void;
}) => {
  const { onSelect, convoId, onUnselect, selectedMembers, showAdmins } = props;
  const weAreAdmin = useWeAreAdmin(convoId);
  const convoProps = useConversationPropsById(convoId);
  if (!convoProps) {
    throw new Error('MemberList needs convoProps');
  }
  let currentMembers = convoProps.members || [];
  if (showAdmins) {
    const { groupAdmins } = convoProps;
    currentMembers = currentMembers.sort(m => (groupAdmins?.includes(m) ? -1 : 0));
  }

  return (
    <>
      {currentMembers.map((member: string) => {
        const isSelected = (weAreAdmin && selectedMembers.includes(member)) || false;

        return (
          <MemberListItem
            pubkey={member}
            isSelected={isSelected}
            onSelect={onSelect}
            onUnselect={onUnselect}
            key={member}
          />
        );
      })}
    </>
  );
};

const ZombiesList = ({ convoId }: { convoId: string }) => {
  const convoProps = useConversationPropsById(convoId);

  function onZombieClicked() {
    if (!convoProps?.weAreAdmin) {
      ToastUtils.pushOnlyAdminCanRemove();
    }
  }
  if (!convoProps || !convoProps.zombies?.length) {
    return null;
  }
  const { zombies, weAreAdmin } = convoProps;

  const zombieElements = zombies.map((zombie: string) => {
    const isSelected = weAreAdmin || false; // && !member.checkmarked;
    return (
      <MemberListItem
        isSelected={isSelected}
        onSelect={onZombieClicked}
        onUnselect={onZombieClicked}
        isZombie={true}
        key={zombie}
        pubkey={zombie}
      />
    );
  });
  return (
    <>
      <SpacerLG />
      {weAreAdmin && (
        <Text
          padding="20px"
          text={window.i18n('removeResidueMembers')}
          subtle={true}
          maxWidth="400px"
          textAlign="center"
        />
      )}
      {zombieElements}
    </>
  );
};
//   // Return members that would comprise the group given the
//   // current state in `users`
//   private getWouldBeMembers(users: Array<ContactType>) {
//     return users.filter(d => {
//       return (d.existingMember && !d.checkmarked) || (!d.existingMember && d.checkmarked);
//     });
//   }

// tslint:disable-next-line: max-func-body-length
async function onSubmit(convoId: string, membersAfterUpdate: Array<string>) {
  // not ideal to get the props here, but this is not run often
  const convoProps = getConversationController()
    .get(convoId)
    .getConversationModelProps();
  if (!convoProps || !convoProps.isGroup || convoProps.isPublic) {
    throw new Error('Invalid convo for updateGroupMembersDialog');
  }
  if (!convoProps.weAreAdmin) {
    window.log.warn('Skipping update of members, we are not the admin');
    return;
  }
  const ourPK = UserUtils.getOurPubKeyStrFromCache();

  const allMembersAfterUpdate = _.uniq(_.concat(membersAfterUpdate, [ourPK]));

  // membersAfterUpdate won't include the zombies. We are the admin and we want to remove them not matter what

  // We need to NOT trigger an group update if the list of member is the same.
  // We need to merge all members, including zombies for this call.
  // We consider that the admin ALWAYS wants to remove zombies (actually they should be removed
  // automatically by him when the LEFT message is received)

  const existingMembers = convoProps.members || [];
  const existingZombies = convoProps.zombies || [];

  const allExistingMembersWithZombies = _.uniq(existingMembers.concat(existingZombies));

  const notPresentInOld = allMembersAfterUpdate.filter(
    m => !allExistingMembersWithZombies.includes(m)
  );

  // be sure to include zombies in here
  const membersToRemove = allExistingMembersWithZombies.filter(
    m => !allMembersAfterUpdate.includes(m)
  );

  // do the xor between the two. if the length is 0, it means the before and the after is the same.
  const xor = _.xor(membersToRemove, notPresentInOld);
  if (xor.length === 0) {
    window.log.info('skipping group update: no detected changes in group member list');

    return;
  }

  // If any extra devices of removed exist in newMembers, ensure that you filter them
  // Note: I think this is useless
  const filteredMembers = allMembersAfterUpdate.filter(
    memberAfterUpdate => !_.includes(membersToRemove, memberAfterUpdate)
  );

  const avatarPath = convoProps.avatarPath || '';
  const groupName = convoProps.name;

  void ClosedGroup.initiateGroupUpdate(
    convoId,
    groupName || 'Unknown',
    filteredMembers,
    avatarPath
  );
}

export const UpdateGroupMembersDialog = (props: Props) => {
  const { conversationId } = props;
  const convoProps = useConversationPropsById(conversationId);
  const existingMembers = convoProps?.members || [];

  const { addTo, removeFrom, uniqueValues: membersToKeepWithUpdate } = useSet<string>(
    existingMembers
  );

  const dispatch = useDispatch();

  if (!convoProps || !convoProps.isGroup || convoProps.isPublic) {
    throw new Error('UpdateGroupMembersDialog invalid convoProps');
  }

  const weAreAdmin = convoProps.weAreAdmin || false;

  const closeDialog = () => {
    dispatch(updateGroupMembersModal(null));
  };

  const onClickOK = async () => {
    // const members = getWouldBeMembers(this.state.contactList).map(d => d.id);
    // do not include zombies here, they are removed by force
    await onSubmit(conversationId, membersToKeepWithUpdate);
    closeDialog();
  };

  useKey((event: KeyboardEvent) => {
    return event.key === 'Esc' || event.key === 'Escape';
  }, closeDialog);

  const onAdd = (member: string) => {
    if (!weAreAdmin) {
      ToastUtils.pushOnlyAdminCanRemove();
      return;
    }

    addTo(member);
    console.warn('onAdd member', member);
  };

  const onRemove = (member: string) => {
    if (!weAreAdmin) {
      window?.log?.warn('Only group admin can remove members!');

      ToastUtils.pushOnlyAdminCanRemove();
      return;
    }
    if (convoProps.groupAdmins?.includes(member)) {
      ToastUtils.pushCannotRemoveCreatorFromGroup();
      window?.log?.warn(
        `User ${member} cannot be removed as they are the creator of the closed group.`
      );
      return;
    }
    console.warn('onRemove member', member);

    removeFrom(member);
  };

  const showNoMembersMessage = existingMembers.length === 0;
  const okText = window.i18n('ok');
  const cancelText = window.i18n('cancel');
  const titleText = window.i18n('updateGroupDialogTitle', [convoProps.name || '']);

  return (
    <SessionWrapperModal title={titleText} onClose={closeDialog}>
      <div className="group-member-list__selection">
        <ClassicMemberList
          convoId={conversationId}
          onSelect={onAdd}
          onUnselect={onRemove}
          selectedMembers={membersToKeepWithUpdate}
          showAdmins={true}
        />
      </div>
      <ZombiesList convoId={conversationId} />
      {showNoMembersMessage && <p>{window.i18n('noMembersInThisGroup')}</p>}

      <SpacerLG />

      <div className="session-modal__button-group">
        <SessionButton text={cancelText} onClick={closeDialog} />
        {weAreAdmin && (
          <SessionButton text={okText} onClick={onClickOK} buttonColor={SessionButtonColor.Green} />
        )}
      </div>
    </SessionWrapperModal>
  );
};
