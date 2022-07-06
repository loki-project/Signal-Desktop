import * as crypto from 'crypto';
import { Attachment } from '../../types/Attachment';

import {
  AttachmentPointer,
  AttachmentPointerWithUrl,
  PreviewWithAttachmentUrl,
  Quote,
  QuotedAttachmentWithUrl,
} from '../messages/outgoing/visibleMessage/VisibleMessage';
import { FSv2 } from '../apis/file_server_api';
import { addAttachmentPadding } from '../crypto/BufferPadding';
import _ from 'lodash';
import { encryptAttachment } from '../../util/crypto/attachmentsEncrypter';

interface UploadParams {
  attachment: Attachment;
  isAvatar?: boolean;
  isRaw?: boolean;
  shouldPad?: boolean;
}

export interface RawPreview {
  url: string;
  title?: string;
  image: Attachment;
}

export interface RawQuoteAttachment {
  contentType?: string;
  fileName?: string;
  thumbnail?: Attachment;
}

export interface RawQuote {
  id: number;
  author: string;
  text?: string;
  attachments?: Array<RawQuoteAttachment>;
}

async function uploadToFsV2(params: UploadParams): Promise<AttachmentPointerWithUrl> {
  const { attachment, isRaw = false, shouldPad = false } = params;
  if (typeof attachment !== 'object' || attachment == null) {
    throw new Error('Invalid attachment passed.');
  }

  if (!(attachment.data instanceof ArrayBuffer)) {
    throw new TypeError(
      `\`attachment.data\` must be an \`ArrayBuffer\`; got: ${typeof attachment.data}`
    );
  }
  const pointer: AttachmentPointer = {
    contentType: attachment.contentType || undefined,
    size: attachment.size,
    fileName: attachment.fileName,
    flags: attachment.flags,
    caption: attachment.caption,
  };

  let attachmentData: ArrayBuffer;

  if (isRaw) {
    attachmentData = attachment.data;
  } else {
    pointer.key = new Uint8Array(crypto.randomBytes(64));
    const iv = new Uint8Array(crypto.randomBytes(16));

    const dataToEncrypt = !shouldPad ? attachment.data : addAttachmentPadding(attachment.data);
    const data = await encryptAttachment(dataToEncrypt, pointer.key.buffer, iv.buffer);
    pointer.digest = new Uint8Array(data.digest);
    attachmentData = data.ciphertext;
  }

  // use file server v2
  if (FSv2.useFileServerAPIV2Sending) {
    const uploadToV2Result = await FSv2.uploadFileToFsV2(attachmentData);
    if (uploadToV2Result) {
      const pointerWithUrl: AttachmentPointerWithUrl = {
        ...pointer,
        id: uploadToV2Result.fileId,
        url: uploadToV2Result.fileUrl,
      };
      return pointerWithUrl;
    }
    window?.log?.warn('upload to file server v2 failed');
    throw new Error(`upload to file server v2 of ${attachment.fileName} failed`);
  }
  throw new Error('Only v2 fileserver upload is supported');
}

export async function uploadAttachmentsToFsV2(
  attachments: Array<Attachment>
): Promise<Array<AttachmentPointerWithUrl>> {
  const promises = (attachments || []).map(async attachment =>
    uploadToFsV2({
      attachment,
      shouldPad: true,
    })
  );

  return Promise.all(promises);
}

export async function uploadLinkPreviewToFsV2(
  preview: RawPreview | null
): Promise<PreviewWithAttachmentUrl | undefined> {
  // some links do not have an image associated, and it makes the whole message fail to send
  if (!preview?.image) {
    window.log.warn('tried to upload file to fsv2 without image.. skipping');
    return preview as any;
  }
  const image = await uploadToFsV2({
    attachment: preview.image,
  });
  return {
    ...preview,
    image,
    id: image.id,
  };
}

export async function uploadQuoteThumbnailsToFsV2(quote?: RawQuote): Promise<Quote | undefined> {
  if (!quote) {
    return undefined;
  }

  const promises = (quote.attachments ?? []).map(async attachment => {
    let thumbnail: AttachmentPointer | undefined;
    if (attachment.thumbnail) {
      thumbnail = await uploadToFsV2({
        attachment: attachment.thumbnail,
      });
    }
    if (!thumbnail) {
      return attachment;
    }
    return {
      ...attachment,
      thumbnail,
      url: thumbnail.url,
      id: thumbnail.id,
    } as QuotedAttachmentWithUrl;
  });

  const attachments = _.compact(await Promise.all(promises));

  return {
    ...quote,
    attachments,
  };
}
