import { View, TextInput, Text, Platform, KeyboardTypeOptions } from 'react-native';
import React from 'react';

interface InputProps {
    label?: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    error?: string;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    className?: string;
    maxLength?: number;
}

export const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    error,
    keyboardType = 'default',
    autoCapitalize = 'none',
    className = '',
    maxLength
}: InputProps) => {
    return (
        <View className={`mb-4 ${className}`}>
            {label && (
                <Text className="text-foreground/70 mb-2 ml-1 font-medium text-sm">
                    {label}
                </Text>
            )}
            <View className={`
        bg-secondary/50 border-2 rounded-2xl px-4 
        ${error ? 'border-destructive' : 'border-transparent'}
        ${Platform.OS === 'ios' ? 'py-4' : 'py-1'}
      `}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    maxLength={maxLength}
                    className="text-foreground text-base"
                />
            </View>
            {error && (
                <Text className="text-destructive text-xs mt-1 ml-1 font-medium">
                    {error}
                </Text>
            )}
        </View>
    );
};
