import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import React from 'react';

interface ButtonProps {
    onPress: () => void;
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    className?: string;
}

export const Button = ({
    onPress,
    title,
    variant = 'primary',
    loading = false,
    disabled = false,
    className = ''
}: ButtonProps) => {
    const baseStyle = "py-4 px-6 rounded-2xl flex-row justify-center items-center";

    const variants = {
        primary: "bg-primary shadow-lg",
        secondary: "bg-secondary",
        outline: "border-2 border-primary bg-transparent",
        ghost: "bg-transparent",
    };

    const textVariants = {
        primary: "text-primary-foreground font-bold text-lg",
        secondary: "text-secondary-foreground font-semibold text-lg",
        outline: "text-primary font-bold text-lg",
        ghost: "text-foreground font-medium text-lg",
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : '#F59E0B'} />
            ) : (
                <Text className={textVariants[variant]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};
