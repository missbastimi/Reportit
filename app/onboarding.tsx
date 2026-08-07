import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { setOnboardingComplete } from '@/lib/onboarding';
import { useOnboardingStore } from '@/store/useOnboardingStore';

const SLIDES: { icon: IconSymbolName; title: string; body: string }[] = [
  {
    icon: 'exclamationmark.bubble.fill',
    title: 'Report issues in your community',
    body: 'See a pothole, a broken streetlight, or illegal dumping? Report it in seconds.',
  },
  {
    icon: 'location.fill',
    title: 'Add a photo and location',
    body: 'Attach a picture and pin the exact spot so it gets fixed faster.',
  },
  {
    icon: 'list.bullet.clipboard.fill',
    title: 'Track the status',
    body: 'Follow your report from Pending all the way to Resolved.',
  },
];

export default function OnboardingScreen() {
  const setCompleted = useOnboardingStore((state) => state.setCompleted);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleFinish = () => {
    // Flip the store immediately for a snappy transition — Stack.Protected
    // in the root layout reacts to this and routes to login/the app on its
    // own, the same way it already does for sign-in. Persisting to
    // AsyncStorage doesn't need to block that transition.
    setCompleted(true);
    void setOnboardingComplete();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setIndex((current) => current + 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <IconSymbol name={slide.icon} size={44} color="#0F766E" />
        </View>
        <Text className="mb-3 text-center text-2xl font-bold text-gray-900">{slide.title}</Text>
        <Text className="text-center text-base text-gray-500">{slide.body}</Text>
      </View>

      <View className="px-8 pb-6">
        <View className="mb-6 flex-row items-center justify-center gap-2">
          {SLIDES.map((item, i) => (
            <View
              key={item.title}
              className={`h-2 rounded-full ${i === index ? 'w-6 bg-primary' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </View>

        <Pressable onPress={handleNext} className="items-center rounded-lg bg-primary px-4 py-4">
          <Text className="text-base font-semibold text-white">
            {isLast ? 'Get started' : 'Next'}
          </Text>
        </Pressable>

        {!isLast ? (
          <Pressable onPress={handleFinish} className="mt-3 items-center py-2">
            <Text className="text-sm font-medium text-gray-500">Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
