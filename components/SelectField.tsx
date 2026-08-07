import { useState } from 'react';
import { Modal, Pressable, Text } from 'react-native';

// Cross-platform "dropdown": a Pressable field that opens a bottom-sheet
// Modal listing options. Same pattern originally built for the report
// form's category picker (app/(tabs)/report.tsx), extracted here so the
// admin dashboard's filters can reuse it instead of duplicating it.
type SelectFieldProps<T extends string> = {
  sheetTitle: string;
  options: T[];
  value: T | null;
  onSelect: (value: T) => void;
  placeholder: string;
  className?: string;
};

export function SelectField<T extends string>({
  sheetTitle,
  options,
  value,
  onSelect,
  placeholder,
  className,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3 ${
          className ?? ''
        }`}>
        <Text
          className={value ? 'text-base text-gray-900' : 'text-base text-gray-400'}
          numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Text className="text-gray-400">▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-2xl bg-white p-4" onPress={() => {}}>
            <Text className="mb-2 text-center text-base font-semibold text-gray-900">
              {sheetTitle}
            </Text>
            {options.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className="border-b border-gray-100 py-3">
                <Text
                  className={
                    option === value
                      ? 'text-base font-semibold text-primary'
                      : 'text-base text-gray-900'
                  }>
                  {option}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOpen(false)} className="mt-2 items-center py-3">
              <Text className="text-base font-medium text-gray-500">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
