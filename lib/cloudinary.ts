const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadImageToCloudinary(localUri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Photo upload is not configured. Please try again later.');
  }

  const filename = localUri.split('/').pop() ?? 'photo.jpg';
  const extensionMatch = /\.(\w+)$/.exec(filename);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: filename,
    type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  } as unknown as Blob);
  formData.append('upload_preset', UPLOAD_PRESET);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    console.error('Cloudinary upload network error:', error);
    throw new Error('Could not reach the photo upload service. Check your connection and try again.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error('Cloudinary upload failed:', response.status, body);
    throw new Error('Failed to upload photo. Please try again.');
  }

  const data = await response.json();

  if (typeof data.secure_url !== 'string') {
    console.error('Cloudinary response missing secure_url:', data);
    throw new Error('Failed to upload photo. Please try again.');
  }

  return data.secure_url;
}
