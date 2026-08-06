import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { createReport } from '@/lib/reports';
import { isNonEmpty } from '@/lib/validation';
import { useAuthStore } from '@/store/useAuthStore';
import type { Category } from '@/types/models';

const CATEGORIES: Category[] = [
  'Potholes',
  'Water Leak',
  'Gutters',
  'Streetlights',
  'Illegal Dumping',
  'Public Facility',
  'Other',
];

type FormErrors = {
  title?: string;
  description?: string;
  category?: string;
};

export default function ReportScreen() {
  const user = useAuthStore((state) => state.user);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'submitting'>('idle');
  const [success, setSuccess] = useState(false);

  const busy = phase !== 'idle';

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!isNonEmpty(title)) nextErrors.title = 'Title is required.';
    if (!isNonEmpty(description)) nextErrors.description = 'Description is required.';
    if (!category) nextErrors.category = 'Please select a category.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setSubmitError('Camera access is needed to take a photo. You can enable it in your device settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSubmitError(null);
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleChooseFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSubmitError(
        'Photo library access is needed to choose a photo. You can enable it in your device settings.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSubmitError(null);
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSuccess(false);

    if (!validate() || !category) return;

    if (!user) {
      setSubmitError('You must be signed in to submit a report.');
      return;
    }

    try {
      let imageUrl: string | null = null;

      if (photoUri) {
        setPhase('uploading');
        try {
          imageUrl = await uploadImageToCloudinary(photoUri);
        } catch (error) {
          setSubmitError(
            error instanceof Error ? error.message : 'Failed to upload photo. Please try again.'
          );
          return;
        }
      }

      setPhase('submitting');
      await createReport({
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrl,
      });

      setTitle('');
      setDescription('');
      setCategory(null);
      setPhotoUri(null);
      setErrors({});
      setSuccess(true);
    } catch (error) {
      console.error('Failed to submit report:', error);
      setSubmitError('Something went wrong submitting your report. Please try again.');
    } finally {
      setPhase('idle');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-10">
        <Text className="mb-1 mt-4 text-3xl font-bold text-gray-900">Report an issue</Text>
        <Text className="mb-6 text-base text-gray-500">
          Let us know what&apos;s happening in your community.
        </Text>

        {success ? (
          <View className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3">
            <Text className="text-sm text-primary">Report submitted. Thank you!</Text>
          </View>
        ) : null}

        {submitError ? (
          <View className="mb-4 rounded-lg border border-error/30 bg-error/10 p-3">
            <Text className="text-sm text-error">{submitError}</Text>
          </View>
        ) : null}

        <Text className="mb-1 text-sm font-medium text-gray-700">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Short summary, e.g. Pothole on Main Street"
          placeholderTextColor="#9CA3AF"
          className="mb-1 rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900"
        />
        {errors.title ? (
          <Text className="mb-3 text-sm text-error">{errors.title}</Text>
        ) : (
          <View className="mb-3" />
        )}

        <Text className="mb-1 text-sm font-medium text-gray-700">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue in detail"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          className="mb-1 min-h-[120px] rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900"
        />
        {errors.description ? (
          <Text className="mb-3 text-sm text-error">{errors.description}</Text>
        ) : (
          <View className="mb-3" />
        )}

        <Text className="mb-1 text-sm font-medium text-gray-700">Category</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mb-1 flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <Text className={category ? 'text-base text-gray-900' : 'text-base text-gray-400'}>
            {category ?? 'Select a category'}
          </Text>
          <Text className="text-gray-400">▾</Text>
        </Pressable>
        {errors.category ? (
          <Text className="mb-3 text-sm text-error">{errors.category}</Text>
        ) : (
          <View className="mb-3" />
        )}

        <View className="mb-1 flex-row items-center gap-2">
          <Text className="text-sm font-medium text-gray-700">Photo</Text>
          <View className="rounded-full bg-accent/15 px-2 py-0.5">
            <Text className="text-xs font-medium text-accent-dark">Optional</Text>
          </View>
        </View>

        {photoUri ? (
          <View className="mb-3">
            <Image source={{ uri: photoUri }} className="mb-2 h-40 w-full rounded-lg" resizeMode="cover" />
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleTakePhoto}
                className="flex-1 items-center rounded-lg border border-primary px-4 py-2.5">
                <Text className="text-sm font-semibold text-primary">Retake</Text>
              </Pressable>
              <Pressable
                onPress={handleChooseFromGallery}
                className="flex-1 items-center rounded-lg border border-primary px-4 py-2.5">
                <Text className="text-sm font-semibold text-primary">Change</Text>
              </Pressable>
              <Pressable
                onPress={() => setPhotoUri(null)}
                className="flex-1 items-center rounded-lg border border-error px-4 py-2.5">
                <Text className="text-sm font-semibold text-error">Remove</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mb-3 flex-row gap-3">
            <Pressable
              onPress={handleTakePhoto}
              className="flex-1 items-center rounded-lg border border-primary px-4 py-3">
              <Text className="text-sm font-semibold text-primary">Take Photo</Text>
            </Pressable>
            <Pressable
              onPress={handleChooseFromGallery}
              className="flex-1 items-center rounded-lg border border-primary px-4 py-3">
              <Text className="text-sm font-semibold text-primary">Choose from Gallery</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={busy}
          className={`mt-4 items-center rounded-lg bg-primary px-4 py-3 ${busy ? 'opacity-60' : ''}`}>
          {busy ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color="#fff" />
              <Text className="text-base font-semibold text-white">
                {phase === 'uploading' ? 'Uploading photo...' : 'Submitting...'}
              </Text>
            </View>
          ) : (
            <Text className="text-base font-semibold text-white">Submit Report</Text>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setPickerOpen(false)}>
          <Pressable className="rounded-t-2xl bg-white p-4" onPress={() => {}}>
            <Text className="mb-2 text-center text-base font-semibold text-gray-900">
              Select a category
            </Text>
            {CATEGORIES.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setCategory(option);
                  setPickerOpen(false);
                }}
                className="border-b border-gray-100 py-3">
                <Text
                  className={
                    option === category
                      ? 'text-base font-semibold text-primary'
                      : 'text-base text-gray-900'
                  }>
                  {option}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPickerOpen(false)} className="mt-2 items-center py-3">
              <Text className="text-base font-medium text-gray-500">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
