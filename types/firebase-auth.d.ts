// firebase/auth's package.json "types" export condition resolves to the
// platform-agnostic declaration file before the "react-native" condition is
// considered, so getReactNativePersistence is missing from the public types
// even though it exists at runtime via Metro's react-native export condition.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
