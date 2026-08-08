import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signUp } from '@/lib/auth';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/lib/validation';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      // The root layout's auth listener + Stack.Protected guard handle navigation.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="mb-1 text-3xl font-bold text-gray-900">Create account</Text>
        <Text className="mb-8 text-base text-gray-500">
          Join ReportIt to report issues affecting your community.
        </Text>

        {error ? (
          <View className="mb-4 rounded-lg border border-error/30 bg-error/10 p-3">
            <Text className="text-sm text-error">{error}</Text>
          </View>
        ) : null}

        <Text className="mb-1 text-sm font-medium text-gray-700">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          placeholder="Kwame Mensah"
          placeholderTextColor="#9CA3AF"
          className="mb-4 rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900"
        />

        <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          className="mb-4 rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900"
        />

        <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          className="mb-6 rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900"
        />

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className={`mb-4 items-center rounded-lg bg-primary px-4 py-3 ${submitting ? 'opacity-60' : ''}`}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Sign Up</Text>
          )}
        </Pressable>

        <Link href="/login" asChild>
          <Pressable>
            <Text className="text-center text-sm text-gray-600">
              Already have an account? <Text className="font-semibold text-primary">Sign in</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
