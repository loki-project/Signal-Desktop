import { isEmpty } from 'lodash';
import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import useKey from 'react-use/lib/useKey';
import styled from 'styled-components';

import { SyncUtils, UserUtils } from '../../../session/utils';
import { YourSessionIDPill, YourSessionIDSelectable } from '../../basic/YourSessionIDPill';

import { useOurAvatarPath, useOurConversationUsername } from '../../../hooks/useParamSelector';
import { ConversationTypeEnum } from '../../../models/conversationAttributes';
import { getConversationController } from '../../../session/conversations';
import { editProfileModal, updateEditProfilePictureModel } from '../../../state/ducks/modalDialog';
import { setLastProfileUpdateTimestamp } from '../../../util/storage';
import { SessionWrapperModal } from '../../SessionWrapperModal';
import { Flex } from '../../basic/Flex';
import { SessionButton } from '../../basic/SessionButton';
import { Spacer2XL, Spacer3XL, SpacerLG, SpacerSM, SpacerXL } from '../../basic/Text';
import { CopyToClipboardButton } from '../../buttons/CopyToClipboardButton';
import { SessionInput } from '../../inputs';
import { SessionSpinner } from '../../loading';
import { sanitizeDisplayNameOrToast } from '../../registration/utils';
import { ProfileHeader, ProfileName, QRView } from './components';
import { handleKeyCancel, handleKeyEditMode, handleKeyEscape, handleKeyQRMode } from './shortcuts';

const StyledEditProfileDialog = styled.div`
  .session-modal {
    width: 468px;
    .session-modal__body {
      width: calc(100% - 80px);
      margin: 0 auto;
      overflow: initial;
    }
  }

  .avatar-center-inner {
    position: relative;

    .qr-view-button {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: -8px;
      right: -8px;
      height: 34px;
      width: 34px;
      border-radius: 50%;
      background-color: var(--white-color);
      transition: var(--default-duration);

      &:hover {
        filter: brightness(90%);
      }

      .session-icon-button {
        opacity: 1;
      }
    }
  }

  input {
    border: none;
  }
`;

const StyledSessionIdSection = styled(Flex)`
  .session-button {
    width: 160px;
  }
`;

const updateDisplayName = async (newName: string) => {
  const ourNumber = UserUtils.getOurPubKeyStrFromCache();
  const conversation = await getConversationController().getOrCreateAndWait(
    ourNumber,
    ConversationTypeEnum.PRIVATE
  );
  conversation.setSessionDisplayNameNoCommit(newName);

  // might be good to not trigger a sync if the name did not change
  await conversation.commit();
  await setLastProfileUpdateTimestamp(Date.now());
  await SyncUtils.forceSyncConfigurationNowIfNeeded(true);
};

export type ProfileDialogModes = 'default' | 'edit' | 'qr';

export const EditProfileDialog = () => {
  const dispatch = useDispatch();

  const _profileName = useOurConversationUsername() || '';
  const [profileName, setProfileName] = useState(_profileName);
  const [updatedProfileName, setUpdateProfileName] = useState(profileName);
  const [profileNameError, setProfileNameError] = useState<string | undefined>(undefined);

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const avatarPath = useOurAvatarPath() || '';
  const ourId = UserUtils.getOurPubKeyStrFromCache();

  const [mode, setMode] = useState<ProfileDialogModes>('default');
  const [loading, setLoading] = useState(false);

  const closeDialog = (event?: any) => {
    if (event?.key || loading) {
      return;
    }
    window.inboxStore?.dispatch(editProfileModal(null));
  };

  const backButton =
    mode === 'edit' || mode === 'qr'
      ? [
          {
            iconType: 'chevron',
            iconRotation: 90,
            onClick: () => {
              if (loading) {
                return;
              }
              setMode('default');
            },
          },
        ]
      : undefined;

  const onClickOK = async () => {
    if (isEmpty(profileName) || !isEmpty(profileNameError)) {
      return;
    }

    setLoading(true);
    await updateDisplayName(profileName);
    setUpdateProfileName(profileName);
    setMode('default');
    setLoading(false);
  };

  const handleProfileHeaderClick = () => {
    if (loading) {
      return;
    }
    closeDialog();
    dispatch(
      updateEditProfilePictureModel({
        avatarPath,
        profileName,
        ourId,
      })
    );
  };

  useKey(
    (event: KeyboardEvent) => {
      return (
        event.key === 'v' ||
        event.key === 'Enter' ||
        event.key === 'Backspace' ||
        event.key === 'Esc' ||
        event.key === 'Escape'
      );
    },
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'v':
          handleKeyQRMode(mode, setMode, loading);
          break;
        case 'Enter':
          handleKeyEditMode(mode, setMode, onClickOK, loading);
          break;
        case 'Backspace':
          handleKeyCancel(
            mode,
            setMode,
            inputRef,
            updatedProfileName,
            setProfileName,
            setProfileNameError,
            loading
          );
          break;
        case 'Esc':
        case 'Escape':
          handleKeyEscape(
            mode,
            setMode,
            updatedProfileName,
            setProfileName,
            setProfileNameError,
            loading,
            dispatch
          );
          break;
        default:
      }
    }
  );

  return (
    <StyledEditProfileDialog className="edit-profile-dialog" data-testid="edit-profile-dialog">
      <SessionWrapperModal
        title={window.i18n('editProfileModalTitle')}
        headerIconButtons={backButton}
        headerReverse={true}
        showExitIcon={true}
        onClose={closeDialog}
        additionalClassName={mode === 'default' ? 'edit-profile-default' : undefined}
      >
        {mode === 'qr' ? (
          <QRView sessionID={ourId} />
        ) : (
          <>
            <SpacerXL />
            <ProfileHeader
              avatarPath={avatarPath}
              profileName={profileName}
              ourId={ourId}
              onClick={handleProfileHeaderClick}
              onQRClick={() => {
                if (loading) {
                  return;
                }
                setMode('qr');
              }}
            />
          </>
        )}

        <SpacerLG />

        {mode === 'default' && (
          <ProfileName
            profileName={updatedProfileName || profileName}
            onClick={() => {
              if (loading) {
                return;
              }
              setMode('edit');
            }}
          />
        )}

        {mode === 'edit' && (
          <SessionInput
            autoFocus={true}
            disableOnBlurEvent={true}
            type="text"
            placeholder={window.i18n('enterDisplayName')}
            value={profileName}
            onValueChanged={(name: string) => {
              const sanitizedName = sanitizeDisplayNameOrToast(name, setProfileNameError);
              setProfileName(sanitizedName);
            }}
            editable={!loading}
            tabIndex={0}
            required={true}
            error={profileNameError}
            textSize={'xl'}
            centerText={true}
            inputRef={inputRef}
            inputDataTestId="profile-name-input"
          />
        )}

        {mode !== 'qr' ? <Spacer3XL /> : <SpacerSM />}

        <StyledSessionIdSection
          container={true}
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          width={'100%'}
        >
          <YourSessionIDPill />
          <SpacerLG />
          <YourSessionIDSelectable />
          <SessionSpinner loading={loading} height={'74px'} />
          {!loading ? <Spacer2XL /> : null}
          {mode === 'default' || mode === 'qr' ? (
            <Flex
              container={true}
              justifyContent={mode === 'default' ? 'space-between' : 'center'}
              alignItems="center"
              flexGap="var(--margins-lg)"
              width={'100%'}
            >
              <CopyToClipboardButton
                copyContent={ourId}
                hotkey={true}
                reference={copyButtonRef}
                dataTestId="copy-button-profile-update"
              />
              {mode === 'default' ? (
                <SessionButton
                  text={window.i18n('qrView')}
                  onClick={() => {
                    setMode('qr');
                  }}
                  dataTestId="view-qr-code-button"
                />
              ) : null}
            </Flex>
          ) : (
            !loading && (
              <SessionButton
                text={window.i18n('save')}
                onClick={onClickOK}
                disabled={loading}
                dataTestId="save-button-profile-update"
              />
            )
          )}

          {!loading ? <SpacerSM /> : null}
        </StyledSessionIdSection>
      </SessionWrapperModal>
    </StyledEditProfileDialog>
  );
};