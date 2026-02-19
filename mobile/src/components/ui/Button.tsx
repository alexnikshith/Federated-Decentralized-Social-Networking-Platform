import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import React from 'react';

interface ButtonProps {
    onPress: () => void;
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    textClassName?: string;
}

export const Button = ({
    onPress,
    title,
    variant = 'primary',
    loading = false,
    disabled = false,
    className = '',
    icon,
    iconPosition = 'right',
    textClassName = ''
}: ButtonProps) => {
    // Base style for the button container
    const baseStyle = "py-4 px-6 rounded-2xl flex-row justify-center items-center";

    // Styles for different button variants
    const variants = {
        primary: "bg-primary shadow-lg shadow-primary/25",
        secondary: "bg-secondary border border-border",
        outline: "border-2 border-primary bg-transparent",
        ghost: "bg-transparent",
        destructive: "bg-destructive shadow-lg shadow-destructive/25",
    };

    // Text styles for different variants
    const textVariants = {
        primary: "text-primary-foreground font-bold text-lg",
        secondary: "text-foreground font-semibold text-lg",
        outline: "text-primary font-bold text-lg",
        ghost: "text-foreground font-medium text-lg",
        destructive: "text-destructive-foreground font-bold text-lg",
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
                <View className="flex-row items-center justify-center space-x-2 w-full">
                    {icon && iconPosition === 'left' && <View className="mr-2">{icon}</View>}
                    <Text className={`${textVariants[variant]} ${textClassName}`}>{title}</Text>
                    {icon && iconPosition === 'right' && <View className="ml-2">{icon}</View>}
                </View>
            )}
        </TouchableOpacity>
    );
};
